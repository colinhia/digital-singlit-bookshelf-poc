"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Book, BookSelection, Bookshelf, RoomControlsHandle } from "@/types/library";
import { getBookAppearanceColor, resolveBookAppearance } from "@/data/bookAppearance";
import { resolveAdjacentBooks, resolveShelfBooks, resolveTableBooks, TABLE_BOOK_CAPACITY } from "@/data/bookPlacement";

const RoomScene = dynamic(() => import("@/components/RoomScene"), { ssr:false, loading:() => <div className="room-loading">Preparing the room…</div> });

type BookField = keyof Book;
type RoomMode = "filters" | "resume" | "moving" | "info";
type LockOrigin = Exclude<RoomMode, "moving"> | null;

interface ViewTransitionDocument extends Document {
  startViewTransition?: (update: () => void) => void;
}

interface RoomState {
  mode: RoomMode;
  selection: BookSelection | null;
  pendingLockFrom: LockOrigin;
}

type RoomAction =
  | { type: "REQUEST_LOCK" }
  | { type: "LOCK_ACQUIRED" }
  | { type: "LOCK_FAILED" }
  | { type: "UNLOCKED" }
  | { type: "SHOW_RESUME" }
  | { type: "OPEN_INFO"; selection: BookSelection }
  | { type: "NAVIGATE_INFO"; selection: BookSelection };

const initialRoomState: RoomState = { mode: "filters", selection: null, pendingLockFrom: null };

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "REQUEST_LOCK":
      return state.mode !== "moving" && state.pendingLockFrom === null
        ? { ...state, pendingLockFrom: state.mode }
        : state;
    case "LOCK_ACQUIRED":
      return state.pendingLockFrom
        ? { mode: "moving", selection: null, pendingLockFrom: null }
        : state;
    case "LOCK_FAILED":
      return state.pendingLockFrom ? { ...state, pendingLockFrom: null } : state;
    case "UNLOCKED":
      return state.mode === "moving"
        ? { mode: "filters", selection: null, pendingLockFrom: null }
        : state;
    case "SHOW_RESUME":
      return state.mode === "filters" || state.mode === "info"
        ? { mode: "resume", selection: null, pendingLockFrom: null }
        : state;
    case "OPEN_INFO":
      return state.mode === "moving"
        ? { mode: "info", selection: action.selection, pendingLockFrom: null }
        : state;
    case "NAVIGATE_INFO":
      return state.mode === "info" && state.selection?.location === action.selection.location
        ? { ...state, selection: action.selection }
        : state;
  }
}

const fieldLabel = (field: string) =>
  field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());

const TITLE_LINE_LIMIT = 3;

function AutoFitTitle({ title }: { title: string }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const heading = headingRef.current;
    if (!slot || !heading) return;

    const fitTitle = () => {
      const slotStyle = getComputedStyle(slot);
      const maximumSize = Number.parseFloat(slotStyle.getPropertyValue("--detail-title-max-size"));
      const minimumSize = Number.parseFloat(slotStyle.getPropertyValue("--detail-title-min-size"));
      if (!Number.isFinite(maximumSize) || !Number.isFinite(minimumSize)) return;

      const setSize = (size: number) => { heading.style.fontSize = `${size}px`; };
      const fits = () => {
        const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
        return heading.scrollHeight <= lineHeight * TITLE_LINE_LIMIT + 1;
      };

      setSize(maximumSize);
      if (fits()) return;

      setSize(minimumSize);
      if (!fits()) return;

      let lower = minimumSize;
      let upper = maximumSize;
      let best = minimumSize;
      while (upper - lower > 0.5) {
        const candidate = (lower + upper) / 2;
        setSize(candidate);
        if (fits()) {
          best = candidate;
          lower = candidate;
        } else {
          upper = candidate;
        }
      }
      setSize(best);
    };

    fitTitle();
    if (typeof ResizeObserver === "undefined") return;

    let frame = 0;
    let previousWidth = slot.clientWidth;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (Math.abs(width - previousWidth) < 0.5) return;
      previousWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitTitle);
    });
    observer.observe(slot);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [title]);

  return <div ref={slotRef} className="detail-title-slot">
    <h2 ref={headingRef} id="book-dialog-title">{title}</h2>
  </div>;
}

export default function Library({ books, bookshelf }: { books: Book[]; bookshelf: Bookshelf }) {
  const [query, setQuery] = useState("");
  const [selectedField, setSelectedField] = useState<BookField | "">("");
  const [tableSerials, setTableSerials] = useState<number[]>([]);
  const [targeted, setTargeted] = useState<BookSelection | null>(null);
  const [roomState, rawDispatch] = useReducer(roomReducer, initialRoomState);
  const [mobile, setMobile] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const roomStateRef = useRef(roomState);
  const controlsRef = useRef<RoomControlsHandle | null>(null);

  const dispatch = useCallback((action: RoomAction) => {
    const current = roomStateRef.current;
    const next = roomReducer(current, action);
    if (Object.is(current, next)) return;
    roomStateRef.current = next;

    const commit = () => rawDispatch(action);
    const transitionDocument = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (current.mode !== next.mode && transitionDocument.startViewTransition && !reduceMotion) {
      transitionDocument.startViewTransition(() => flushSync(commit));
    } else {
      commit();
    }
  }, []);

  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);

  const searchFields = useMemo(
    () => (books[0] ? (Object.keys(books[0]) as BookField[]) : []),
    [books]
  );
  const activeField = searchFields.includes(selectedField as BookField)
    ? selectedField as BookField
    : undefined;
  const languageCount = new Set(books.map((book) => book.language)).size;

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return [...books].sort((a, b) => a.serialNumber - b.serialNumber).filter((book) =>
      !term || activeField === undefined || String(book[activeField]).toLocaleLowerCase().includes(term)
    );
  }, [activeField, books, query]);
  const matchingSerials = useMemo(() => new Set(filtered.map((book) => book.serialNumber)), [filtered]);
  const tableSerialSet = useMemo(() => new Set(tableSerials), [tableSerials]);
  const tableBooks = useMemo(() => resolveTableBooks(books, tableSerials), [books, tableSerials]);
  const shelfNavigationBooks = useMemo(
    () => resolveShelfBooks(filtered, tableSerials),
    [filtered, tableSerials],
  );
  const shelfBooks = useMemo(() => resolveShelfBooks(books, tableSerials), [books, tableSerials]);

  const setControls = useCallback((controls: RoomControlsHandle | null) => {
    controlsRef.current = controls;
  }, []);

  const requestMoving = useCallback(() => {
    const current = roomStateRef.current;
    if (current.mode === "moving" || current.pendingLockFrom !== null) return;
    dispatch({ type: "REQUEST_LOCK" });
    if (mobile) {
      dispatch({ type: "LOCK_ACQUIRED" });
      return;
    }
    const controls = controlsRef.current;
    if (!controls) {
      dispatch({ type: "LOCK_FAILED" });
      return;
    }
    if (controls.isLocked()) {
      dispatch({ type: "LOCK_ACQUIRED" });
      return;
    }
    try {
      controls.lock();
    } catch {
      dispatch({ type: "LOCK_FAILED" });
    }
  }, [dispatch, mobile]);

  const pauseRoom = useCallback(() => {
    if (roomStateRef.current.mode !== "moving") return;
    if (mobile) dispatch({ type: "UNLOCKED" });
    else controlsRef.current?.unlock();
  }, [dispatch, mobile]);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    const canvas = document.createElement("canvas");
    setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onPointerLockError = () => dispatch({ type: "LOCK_FAILED" });
    document.addEventListener("pointerlockerror", onPointerLockError);
    return () => document.removeEventListener("pointerlockerror", onPointerLockError);
  }, [dispatch]);

  const handleControlsLock = useCallback(() => {
    if (!mobile) dispatch({ type: "LOCK_ACQUIRED" });
  }, [dispatch, mobile]);

  const handleControlsUnlock = useCallback(() => {
    if (!mobile) dispatch({ type: "UNLOCKED" });
  }, [dispatch, mobile]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      const mode = roomStateRef.current.mode;
      if (mode !== "filters" && mode !== "info") return;
      event.preventDefault();
      dispatch({ type: "SHOW_RESUME" });
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [dispatch]);

  useEffect(() => {
    if (roomState.mode !== "info" || !roomState.selection) return;
    if (!mobile && controlsRef.current?.isLocked()) controlsRef.current.unlock();
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [mobile, roomState.mode]);

  useEffect(() => {
    if (roomState.mode === "resume") resumeRef.current?.focus();
  }, [roomState.mode]);

  const openBook = useCallback((selection: BookSelection) => {
    if (roomStateRef.current.mode !== "moving") return;
    dispatch({ type: "OPEN_INFO", selection });
  }, [dispatch]);

  const addSelectedBookToTable = useCallback(() => {
    const current = roomStateRef.current.selection;
    if (!current || current.location !== "shelf") return;
    if (tableSerials.length >= TABLE_BOOK_CAPACITY || tableSerialSet.has(current.book.serialNumber)) return;
    setTableSerials([...tableSerials, current.book.serialNumber]);
    requestMoving();
  }, [requestMoving, tableSerials, tableSerialSet]);

  const returnSelectedBookToShelf = useCallback(() => {
    const current = roomStateRef.current.selection;
    if (!current || current.location !== "table") return;
    if (!tableSerialSet.has(current.book.serialNumber)) return;
    setTableSerials(tableSerials.filter((serialNumber) => serialNumber !== current.book.serialNumber));
    requestMoving();
  }, [requestMoving, tableSerials, tableSerialSet]);

  const selection = roomState.selection;
  const selectedBook = selection?.book ?? null;
  const selectedAppearance = selectedBook ? resolveBookAppearance(selectedBook) : null;
  const navigationBooks = selection?.location === "table" ? tableBooks : shelfNavigationBooks;
  const { index: selectedNavigationIndex, previous: previousBook, next: nextBook } = resolveAdjacentBooks(
    navigationBooks,
    selectedBook?.serialNumber,
  );
  const navigateInfo = useCallback((book: Book | null) => {
    const location = roomStateRef.current.selection?.location;
    if (!book || !location) return;
    dispatch({ type: "NAVIGATE_INFO", selection: { book, location } });
  }, [dispatch]);

  return <main className="library-room">
    <section className="viewport" aria-label={`${bookshelf.name}, an interactive three-dimensional library`}>
      {webgl ? <RoomScene books={shelfBooks} tableBooks={tableBooks} matchingSerials={matchingSerials} onSelect={openBook} onTarget={setTargeted} target={targeted} mobile={mobile} onControlsReady={setControls} onLock={handleControlsLock} onUnlock={handleControlsUnlock} /> : <div className="webgl-fallback"><h1>{bookshelf.name}</h1><p>Your browser cannot display the 3D room. Use the accessible collection list below.</p></div>}

      <header className="room-header">
        <div className="brand"><span className="brand-mark">SL</span><span>SINGAPORE LITERATURE<br/>DIGITAL LIBRARY</span></div>
        <button className="menu-toggle" type="button" onClick={pauseRoom} aria-expanded={roomState.mode === "filters"}>PAUSE / FILTERS <kbd>ESC</kbd></button>
      </header>

      <div className={`hud-panel ${roomState.mode === "filters" ? "is-open" : ""}`}>
        <p className="eyebrow">ROOM 01 · {bookshelf.name}</p>
        <p className="hud-description">{bookshelf.description}</p>
        <div className="search-controls">
          <label className="field-control">
            <span>Type:</span>
            <select
              value={activeField ?? ""}
              onChange={(event) => setSelectedField(event.target.value as BookField)}
              disabled={!searchFields.length}
            >
              <option value="" disabled>Select a query field</option>
              {searchFields.map((field) => <option value={field} key={field}>{fieldLabel(field)}</option>)}
            </select>
          </label>
          <label className="query-control">
            <span>Query:</span>
            <div className="query-input">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeField ? `Search by ${fieldLabel(activeField).toLocaleLowerCase()}…` : "Select a query field first…"} />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
            </div>
          </label>
        </div>
        <p className="result-count"><strong>{filtered.length}</strong> matching {filtered.length === 1 ? "volume" : "volumes"}</p>
      </div>

      {roomState.mode === "moving" && <div className="crosshair" aria-hidden="true"><span /><span /></div>}
      <div className={`target-card ${roomState.mode === "moving" && targeted ? "is-visible" : ""}`} aria-live="polite">
        {targeted && <><span>{targeted.location === "table" ? "ON TABLE" : `S/N ${String(targeted.book.serialNumber).padStart(3,"0")}`}</span><strong>{targeted.book.title}</strong><small>{targeted.book.author}</small></>}
      </div>

      {webgl && <button ref={resumeRef} className={`enter-room ${roomState.mode === "filters" || roomState.mode === "resume" ? "" : "is-hidden"}`} aria-hidden={roomState.mode !== "filters" && roomState.mode !== "resume"} tabIndex={roomState.mode === "filters" || roomState.mode === "resume" ? 0 : -1} onClick={requestMoving}>
        <span>{roomState.mode === "resume" ? (mobile ? "Tap to resume the room" : "Click to resume the room") : (mobile ? "Touch and drag to look around" : "Click to enter the room")}</span>
        <small>{roomState.mode === "resume" ? "Enter or Space also resumes" : (mobile ? "Aim the crosshair, then tap a book" : "Move to look · aim and click a book · Escape to release")}</small>
      </button>}

      {!filtered.length && <div className="empty-room"><h2>No matching books</h2><p>All volumes remain visible in a muted state.</p><button onClick={() => setQuery("")}>Clear search</button></div>}

      <footer className="room-footer"><span>ARRANGED BY S/N · ASCENDING</span><span>{tableBooks.length}/{TABLE_BOOK_CAPACITY} ON TABLE · {books.length} VOLUMES · {languageCount} LANGUAGES · 600 SLOTS</span></footer>
    </section>

    <div className="sr-collection" aria-label="Accessible matching shelf books">
      {shelfNavigationBooks.map((book) => <button key={book.serialNumber} onClick={() => openBook({ book, location: "shelf" })}>Open {book.title} by {book.author} from shelf</button>)}
    </div>
    <div className="sr-collection" aria-label="Accessible books on table">
      {tableBooks.map((book) => <button key={book.serialNumber} onClick={() => openBook({ book, location: "table" })}>Open {book.title} by {book.author} from table</button>)}
    </div>

    {roomState.mode === "info" && selection && selectedBook && selectedAppearance && <div className="backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestMoving()}>
      <article className="detail" role="dialog" aria-modal="true" aria-labelledby="book-dialog-title">
        <button ref={closeRef} className="close" onClick={requestMoving} aria-label="Close book details">×</button>
        <div className="detail-cover" style={{
          "--book-color": getBookAppearanceColor(selectedAppearance),
          "--book-text-color": selectedAppearance.textColor,
          ...(selectedAppearance.kind === "image" ? { "--book-image": `url(${selectedAppearance.assetPath})` } : {}),
        } as React.CSSProperties}>
          <span>SINGLIT<br/>COLLECTION</span><strong>{selectedBook.title}</strong><small>{selectedBook.author}</small><b>{String(selectedBook.serialNumber).padStart(3,"0")}</b>
        </div>
        <div className="detail-copy">
          <div className="detail-navigation" aria-label={`${selection.location === "table" ? "Table" : "Shelf"} book navigation`}>
            <button type="button" onClick={() => navigateInfo(previousBook)} disabled={!previousBook} aria-label="Previous book">← Previous</button>
            <span>{selectedNavigationIndex >= 0 ? selectedNavigationIndex + 1 : "–"} / {navigationBooks.length}</span>
            <button type="button" onClick={() => navigateInfo(nextBook)} disabled={!nextBook} aria-label="Next book">Next →</button>
          </div>
          <p className="eyebrow">{selection.location === "table" ? "ON TABLE" : "ON SHELF"} · VOLUME {String(selectedBook.serialNumber).padStart(3,"0")}</p>
          <AutoFitTitle title={selectedBook.title} />
          <p className="author">by {selectedBook.author}</p>
          <dl>
            <div><dt>Language</dt><dd>{selectedBook.language}</dd></div>
            <div><dt>Location</dt><dd>{selectedBook.locationCode}</dd></div>
            <div><dt>Call number</dt><dd>{selectedBook.callNumber}</dd></div>
            <div><dt>Barcode</dt><dd>{selectedBook.barcode}</dd></div>
            <div><dt>Serial number</dt><dd>{selectedBook.serialNumber}</dd></div>
          </dl>
          <div className="detail-actions">
            {selection.location === "shelf" ? <button
              type="button"
              onClick={addSelectedBookToTable}
              disabled={tableSerialSet.has(selectedBook.serialNumber) || tableBooks.length >= TABLE_BOOK_CAPACITY}
            >{tableBooks.length >= TABLE_BOOK_CAPACITY ? `Table full · ${TABLE_BOOK_CAPACITY}/${TABLE_BOOK_CAPACITY}` : `Add to table · ${tableBooks.length}/${TABLE_BOOK_CAPACITY}`}</button> : <button type="button" onClick={returnSelectedBookToShelf}>Return to shelf</button>}
          </div>
        </div>
      </article>
    </div>}
  </main>;
}
