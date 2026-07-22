"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Book, RoomControlsHandle } from "@/types/library";
import { getBookAppearanceColor, resolveBookAppearance } from "@/components/scene-assets/books/bookAppearance";
import {
  COMPLETED_CAPACITY,
  READING_LIST_CAPACITY,
} from "@/experiences/mylibrary/layout";
import type {
  CuratedLibraryState,
  MyLibraryMode,
  MyLibraryRole,
  MyLibrarySelection,
  MyLibraryTarget,
} from "@/experiences/mylibrary/types";

const RoomScene = dynamic(() => import("@/experiences/mylibrary/RoomScene"), {
  ssr: false,
  loading: () => <div className="room-loading">Preparing My Library…</div>,
});

const EMPTY_LIBRARY: CuratedLibraryState = {
  readingListSerials: [],
  currentlyReadingSerial: null,
  completedSerials: [],
};

type CatalogueField = "title" | "author" | "language" | "callNumber";

const CATALOGUE_FIELDS: Array<{ value: CatalogueField; label: string }> = [
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "language", label: "Language" },
  { value: "callNumber", label: "Call number" },
];

function visitorLibrary(books: Book[]): CuratedLibraryState {
  const serials = [...books]
    .sort((left, right) => left.serialNumber - right.serialNumber)
    .map((book) => book.serialNumber);
  return {
    completedSerials: serials.slice(0, 12),
    currentlyReadingSerial: serials[12] ?? null,
    readingListSerials: serials.slice(13, 19),
  };
}

function sameSelection(left: MyLibrarySelection | null, right: MyLibrarySelection | null) {
  return left?.location === right?.location && left?.book.serialNumber === right?.book.serialNumber;
}

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
    <h2 ref={headingRef} id="my-library-book-dialog-title">{title}</h2>
  </div>;
}

function locationLabel(location: MyLibrarySelection["location"]) {
  if (location === "reading-list") return "READING LIST";
  if (location === "currently-reading") return "CURRENTLY READING";
  return "COMPLETED COLLECTION";
}

export default function MyLibrary({ books }: { books: Book[] }) {
  const [role, setRole] = useState<MyLibraryRole | null>(null);
  const [library, setLibrary] = useState<CuratedLibraryState>(EMPTY_LIBRARY);
  const [mode, setMode] = useState<MyLibraryMode>("role");
  const [selection, setSelection] = useState<MyLibrarySelection | null>(null);
  const [target, setTarget] = useState<MyLibraryTarget | null>(null);
  const [catalogueField, setCatalogueField] = useState<CatalogueField | "">("");
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [visibleCatalogueCount, setVisibleCatalogueCount] = useState(50);
  const [catalogueNotice, setCatalogueNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const controlsRef = useRef<RoomControlsHandle | null>(null);
  const modeRef = useRef<MyLibraryMode>("role");
  const ownerRoleRef = useRef<HTMLButtonElement>(null);
  const catalogueFieldRef = useRef<HTMLSelectElement>(null);
  const infoCloseRef = useRef<HTMLButtonElement>(null);

  const changeMode = useCallback((next: MyLibraryMode) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  const booksBySerial = useMemo(
    () => new Map(books.map((book) => [book.serialNumber, book])),
    [books],
  );
  const resolveSerials = useCallback(
    (serials: number[]) => serials.flatMap((serial) => {
      const book = booksBySerial.get(serial);
      return book ? [book] : [];
    }),
    [booksBySerial],
  );
  const readingListBooks = useMemo(
    () => resolveSerials(library.readingListSerials),
    [library.readingListSerials, resolveSerials],
  );
  const completedBooks = useMemo(
    () => resolveSerials(library.completedSerials),
    [library.completedSerials, resolveSerials],
  );
  const currentlyReadingBook = library.currentlyReadingSerial === null
    ? null
    : booksBySerial.get(library.currentlyReadingSerial) ?? null;
  const librarySerials = useMemo(() => new Set([
    ...library.readingListSerials,
    ...library.completedSerials,
    ...(library.currentlyReadingSerial === null ? [] : [library.currentlyReadingSerial]),
  ]), [library]);
  const matchingCatalogueBooks = useMemo(() => {
    const term = catalogueQuery.trim().toLocaleLowerCase();
    return [...books]
      .sort((left, right) => left.serialNumber - right.serialNumber)
      .filter((book) => !term || !catalogueField
        || String(book[catalogueField]).toLocaleLowerCase().includes(term));
  }, [books, catalogueField, catalogueQuery]);
  const visibleCatalogueBooks = matchingCatalogueBooks.slice(0, visibleCatalogueCount);
  const navigationBooks = selection?.location === "reading-list"
    ? readingListBooks
    : selection?.location === "completed"
      ? completedBooks
      : currentlyReadingBook ? [currentlyReadingBook] : [];
  const selectedNavigationIndex = selection
    ? navigationBooks.findIndex((book) => book.serialNumber === selection.book.serialNumber)
    : -1;
  const previousBook = selectedNavigationIndex > 0 ? navigationBooks[selectedNavigationIndex - 1] : null;
  const nextBook = selectedNavigationIndex >= 0 && selectedNavigationIndex < navigationBooks.length - 1
    ? navigationBooks[selectedNavigationIndex + 1]
    : null;
  const selectedAppearance = selection ? resolveBookAppearance(selection.book) : null;

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
    const overlayOpen = mode === "role" || mode === "catalogue" || mode === "info";
    if (!overlayOpen) return;
    const frame = requestAnimationFrame(() => {
      if (mode === "role") ownerRoleRef.current?.focus();
      if (mode === "catalogue") catalogueFieldRef.current?.focus();
      if (mode === "info") infoCloseRef.current?.focus();
    });
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
    };
  }, [mode]);

  useEffect(() => {
    setVisibleCatalogueCount(50);
    setCatalogueNotice("");
  }, [catalogueQuery]);

  useEffect(() => {
    const onPointerLockError = () => changeMode("resume");
    document.addEventListener("pointerlockerror", onPointerLockError);
    return () => document.removeEventListener("pointerlockerror", onPointerLockError);
  }, [changeMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      if (modeRef.current === "catalogue" || modeRef.current === "info") {
        event.preventDefault();
        setSelection(null);
        changeMode("resume");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [changeMode]);

  const chooseRole = useCallback((nextRole: MyLibraryRole) => {
    setRole(nextRole);
    setLibrary(nextRole === "visitor" ? visitorLibrary(books) : EMPTY_LIBRARY);
    setSelection(null);
    setTarget(null);
    changeMode("pause");
  }, [books, changeMode]);

  const setControls = useCallback((controls: RoomControlsHandle | null) => {
    controlsRef.current = controls;
  }, []);

  const enterRoom = useCallback(() => {
    if (!role || modeRef.current === "moving") return;
    if (mobile) {
      changeMode("moving");
      return;
    }
    try {
      controlsRef.current?.lock();
    } catch {
      changeMode("resume");
    }
  }, [changeMode, mobile, role]);

  const pauseRoom = useCallback(() => {
    if (modeRef.current !== "moving") return;
    if (mobile) changeMode("pause");
    else controlsRef.current?.unlock();
  }, [changeMode, mobile]);

  const openTarget = useCallback((nextTarget: MyLibraryTarget) => {
    if (modeRef.current !== "moving") return;
    if (nextTarget.kind === "reading-shelf") {
      if (role !== "owner") return;
      setCatalogueNotice("");
      changeMode("catalogue");
    } else {
      setSelection(nextTarget.selection);
      changeMode("info");
    }
    if (!mobile) controlsRef.current?.unlock();
  }, [changeMode, mobile, role]);

  const closeOverlay = useCallback(() => {
    setSelection(null);
    changeMode("resume");
  }, [changeMode]);

  const addToReadingList = useCallback((book: Book) => {
    if (role !== "owner") return;
    setLibrary((current) => {
      const exists = current.readingListSerials.includes(book.serialNumber)
        || current.completedSerials.includes(book.serialNumber)
        || current.currentlyReadingSerial === book.serialNumber;
      if (exists || current.readingListSerials.length >= READING_LIST_CAPACITY) return current;
      return {
        ...current,
        readingListSerials: [...current.readingListSerials, book.serialNumber],
      };
    });
    setCatalogueNotice(`Added “${book.title}” to your reading list.`);
  }, [role]);

  const navigateInfo = useCallback((book: Book | null) => {
    if (!book || !selection) return;
    setSelection({ book, location: selection.location });
  }, [selection]);

  const removeSelected = useCallback(() => {
    if (role !== "owner" || !selection) return;
    const serial = selection.book.serialNumber;
    setLibrary((current) => ({
      readingListSerials: current.readingListSerials.filter((value) => value !== serial),
      currentlyReadingSerial: current.currentlyReadingSerial === serial ? null : current.currentlyReadingSerial,
      completedSerials: current.completedSerials.filter((value) => value !== serial),
    }));
    closeOverlay();
  }, [closeOverlay, role, selection]);

  const startReading = useCallback(() => {
    if (role !== "owner" || selection?.location !== "reading-list") return;
    const serial = selection.book.serialNumber;
    setLibrary((current) => {
      if (!current.readingListSerials.includes(serial)) return current;
      const readingListWithoutSelected = current.readingListSerials.filter((value) => value !== serial);
      return {
        ...current,
        readingListSerials: current.currentlyReadingSerial === null
          ? readingListWithoutSelected
          : [...readingListWithoutSelected, current.currentlyReadingSerial],
        currentlyReadingSerial: serial,
      };
    });
    closeOverlay();
  }, [closeOverlay, role, selection]);

  const moveSelectedToCompleted = useCallback(() => {
    if (role !== "owner" || !selection || selection.location === "completed") return;
    const serial = selection.book.serialNumber;
    setLibrary((current) => {
      if (current.completedSerials.length >= COMPLETED_CAPACITY) return current;
      return {
        readingListSerials: current.readingListSerials.filter((value) => value !== serial),
        currentlyReadingSerial: current.currentlyReadingSerial === serial ? null : current.currentlyReadingSerial,
        completedSerials: current.completedSerials.includes(serial)
          ? current.completedSerials
          : [...current.completedSerials, serial],
      };
    });
    closeOverlay();
  }, [closeOverlay, role, selection]);

  const moving = mode === "moving";
  const canResume = mode === "pause" || mode === "resume";
  const targetedSelection = target?.kind === "book" ? target.selection : null;

  return <main className="library-room my-library-room">
    <section className="viewport">
      {webgl ? <RoomScene
        readingListBooks={readingListBooks}
        completedBooks={completedBooks}
        currentlyReadingBook={currentlyReadingBook}
        mobile={mobile}
        target={target}
        onTarget={(nextTarget) => setTarget((current) => {
          if (current?.kind === "book" && nextTarget?.kind === "book"
            && sameSelection(current.selection, nextTarget.selection)) return current;
          if (current?.kind === nextTarget?.kind && current?.kind === "reading-shelf") return current;
          return nextTarget;
        })}
        onActivateTarget={openTarget}
        onControlsReady={setControls}
        onLock={() => changeMode("moving")}
        onUnlock={() => {
          if (modeRef.current === "moving") changeMode("pause");
        }}
      /> : <div className="webgl-fallback"><h1>My Library</h1><p>Your browser cannot display the 3D room.</p></div>}

      <header className="room-header">
        <div className="brand"><span className="brand-mark">ML</span><span>MY LIBRARY<br/>CURATION POC</span></div>
        {moving && <button className="menu-toggle" type="button" onClick={pauseRoom}>PAUSE <kbd>ESC</kbd></button>}
      </header>

      {mode === "pause" && <div className="hud-panel my-library-hud is-open">
        <p className="eyebrow">{role?.toUpperCase()} MODE</p>
        <h2>My Library</h2>
        <p className="hud-description">{role === "owner"
          ? "Aim at the reading-list shelf to add books, or select a book to update its place."
          : "Explore this demonstration library. Visitor mode is read-only."}</p>
        <dl className="library-summary">
          <div><dt>Reading list</dt><dd>{readingListBooks.length}/{READING_LIST_CAPACITY}</dd></div>
          <div><dt>Currently reading</dt><dd>{currentlyReadingBook ? 1 : 0}/1</dd></div>
          <div><dt>Completed</dt><dd>{completedBooks.length}/{COMPLETED_CAPACITY}</dd></div>
        </dl>
        <div className="hud-footer"><Link className="hud-home-link" href="/">← Back to home</Link></div>
      </div>}

      {moving && <div className="crosshair" aria-hidden="true"><span/><span/></div>}
      <div className={`target-card ${moving && target ? "is-visible" : ""}`} aria-live="polite">
        {target?.kind === "reading-shelf" ? <>
          <span>{role === "owner" ? "OPEN CATALOGUE" : "READING LIST"}</span>
          <strong>Want to read</strong>
          <small>{role === "owner" ? "Select this shelf to add a book" : "Owner access required to edit"}</small>
        </> : targetedSelection && <>
          <span>{targetedSelection.location.replaceAll("-", " ").toUpperCase()}</span>
          <strong>{targetedSelection.book.title}</strong>
          <small>{targetedSelection.book.author}</small>
        </>}
      </div>

      {webgl && <button
        className={`enter-room ${canResume ? "" : "is-hidden"}`}
        aria-hidden={!canResume}
        tabIndex={canResume ? 0 : -1}
        onClick={enterRoom}
      >
        <span>{mode === "resume"
          ? (mobile ? "Tap to resume My Library" : "Click to resume My Library")
          : (mobile ? "Touch and drag to look around" : "Click to enter My Library")}</span>
        <small>{mobile ? "Aim the crosshair, then tap" : "Move to look · aim and click · Escape to release"}</small>
      </button>}

      <footer className="room-footer">
        <span>{role ? `${role.toUpperCase()} · SESSION ONLY` : "CHOOSE A ROLE TO BEGIN"}</span>
        <span>{readingListBooks.length} TO READ · {currentlyReadingBook ? 1 : 0} READING · {completedBooks.length} COMPLETED</span>
      </footer>
    </section>

    {mode === "role" && <div className="backdrop role-backdrop">
      <article className="role-card" role="dialog" aria-modal="true" aria-labelledby="role-title">
        <p className="eyebrow">MY LIBRARY POC</p>
        <h1 id="role-title">How would you like to enter?</h1>
        <p>Your choice lasts for this visit only.</p>
        <div className="role-options">
          <button ref={ownerRoleRef} type="button" onClick={() => chooseRole("owner")}>
            <strong>Enter as Owner</strong>
            <span>Start empty and curate your own reading space.</span>
          </button>
          <button type="button" onClick={() => chooseRole("visitor")}>
            <strong>Enter as Visitor</strong>
            <span>Explore a populated demonstration without making changes.</span>
          </button>
        </div>
        <Link className="role-home-link" href="/">← Back to home</Link>
      </article>
    </div>}

    {mode === "catalogue" && <div className="backdrop" role="presentation">
      <article className="catalogue-panel" role="dialog" aria-modal="true" aria-labelledby="catalogue-title">
        <button className="close" type="button" onClick={closeOverlay} aria-label="Close catalogue">×</button>
        <p className="eyebrow">OWNER MODE</p>
        <h2 id="catalogue-title">Add to your reading list</h2>
        <p className="catalogue-introduction">Browse the SingLit catalogue, or choose a query field and enter a search.</p>
        <div className="search-controls catalogue-search-controls">
          <label className="field-control">
            <span>Type:</span>
            <select
              ref={catalogueFieldRef}
              value={catalogueField}
              onChange={(event) => setCatalogueField(event.target.value as CatalogueField)}
            >
              <option value="" disabled>Select a query field</option>
              {CATALOGUE_FIELDS.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
            </select>
          </label>
          <label className="query-control">
            <span>Query:</span>
            <div className="query-input">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                value={catalogueQuery}
                onChange={(event) => setCatalogueQuery(event.target.value)}
                placeholder={catalogueField
                  ? `Search by ${CATALOGUE_FIELDS.find((field) => field.value === catalogueField)?.label.toLocaleLowerCase()}…`
                  : "Select a query field first…"}
              />
              {catalogueQuery && <button type="button" onClick={() => setCatalogueQuery("")} aria-label="Clear catalogue search">×</button>}
            </div>
          </label>
        </div>
        <div className="catalogue-status">
          <span><strong>{matchingCatalogueBooks.length}</strong> results</span>
          <span><strong>{readingListBooks.length}</strong>/{READING_LIST_CAPACITY} on reading list</span>
        </div>
        {catalogueNotice && <p className="catalogue-notice" role="status">{catalogueNotice}</p>}
        <ul className="catalogue-results">
          {visibleCatalogueBooks.map((book) => {
            const alreadyAdded = librarySerials.has(book.serialNumber);
            const readingListFull = readingListBooks.length >= READING_LIST_CAPACITY;
            const disabled = alreadyAdded || readingListFull;
            return <li key={book.serialNumber}>
              <div>
                <span>{book.language} · S/N {String(book.serialNumber).padStart(3, "0")}</span>
                <strong>{book.title}</strong>
                <small>{book.author} · {book.callNumber}</small>
              </div>
              <button type="button" onClick={() => addToReadingList(book)} disabled={disabled}>
                {alreadyAdded ? "Already in library" : readingListFull ? "Reading list full" : "Add to reading list"}
              </button>
            </li>;
          })}
        </ul>
        {!matchingCatalogueBooks.length && <p className="catalogue-empty">No catalogue books match this search.</p>}
        {visibleCatalogueCount < matchingCatalogueBooks.length && <button
          className="catalogue-more"
          type="button"
          onClick={() => setVisibleCatalogueCount((count) => count + 50)}
        >Show 50 more</button>}
      </article>
    </div>}

    {mode === "info" && selection && selectedAppearance && <div className="backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeOverlay()}>
      <article className="detail" role="dialog" aria-modal="true" aria-labelledby="my-library-book-dialog-title">
        <button ref={infoCloseRef} className="close" type="button" onClick={closeOverlay} aria-label="Close book details">×</button>
        <div className="detail-cover" style={{
          "--book-color": getBookAppearanceColor(selectedAppearance),
          "--book-text-color": selectedAppearance.textColor,
          ...(selectedAppearance.kind === "image" ? { "--book-image": `url(${selectedAppearance.assetPath})` } : {}),
        } as React.CSSProperties}>
          <span>MY<br/>LIBRARY</span>
          <strong>{selection.book.title}</strong>
          <small>{selection.book.author}</small>
          <b>{String(selection.book.serialNumber).padStart(3, "0")}</b>
        </div>
        <div className="detail-copy">
          <div className="detail-navigation" aria-label={`${locationLabel(selection.location)} book navigation`}>
            <button type="button" onClick={() => navigateInfo(previousBook)} disabled={!previousBook} aria-label="Previous book">← Previous</button>
            <span>{selectedNavigationIndex >= 0 ? selectedNavigationIndex + 1 : "–"} / {navigationBooks.length}</span>
            <button type="button" onClick={() => navigateInfo(nextBook)} disabled={!nextBook} aria-label="Next book">Next →</button>
          </div>
          <p className="eyebrow">{locationLabel(selection.location)} · VOLUME {String(selection.book.serialNumber).padStart(3, "0")}</p>
          <AutoFitTitle title={selection.book.title} />
          <p className="author">by {selection.book.author}</p>
          <dl>
            <div><dt>Language</dt><dd>{selection.book.language}</dd></div>
            <div><dt>Location</dt><dd>{selection.book.locationCode}</dd></div>
            <div><dt>Call number</dt><dd>{selection.book.callNumber}</dd></div>
            <div><dt>Barcode</dt><dd>{selection.book.barcode}</dd></div>
            <div><dt>Serial number</dt><dd>{selection.book.serialNumber}</dd></div>
          </dl>
          {role === "owner" ? <div className="detail-actions">
            {selection.location === "reading-list" && <>
              <button type="button" onClick={startReading}>Start reading</button>
              <button className="secondary" type="button" onClick={moveSelectedToCompleted} disabled={completedBooks.length >= COMPLETED_CAPACITY}>Move to completed</button>
            </>}
            {selection.location === "currently-reading" && <button type="button" onClick={moveSelectedToCompleted} disabled={completedBooks.length >= COMPLETED_CAPACITY}>Move to completed</button>}
            <button className="secondary danger" type="button" onClick={removeSelected}>Remove from My Library</button>
          </div> : <p className="read-only-note">Visitor mode · information only</p>}
        </div>
      </article>
    </div>}

    <div className="sr-collection" aria-label="Books in My Library">
      {readingListBooks.map((book) => <button key={`reading-${book.serialNumber}`} onClick={() => { setSelection({ book, location: "reading-list" }); changeMode("info"); }}>Open {book.title} by {book.author} from reading list</button>)}
      {currentlyReadingBook && <button onClick={() => { setSelection({ book: currentlyReadingBook, location: "currently-reading" }); changeMode("info"); }}>Open {currentlyReadingBook.title} by {currentlyReadingBook.author} from currently reading</button>}
      {completedBooks.map((book) => <button key={`completed-${book.serialNumber}`} onClick={() => { setSelection({ book, location: "completed" }); changeMode("info"); }}>Open {book.title} by {book.author} from completed collection</button>)}
    </div>
  </main>;
}
