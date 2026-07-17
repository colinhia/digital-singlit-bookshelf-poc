"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Book, Bookshelf } from "@/types/library";

const colors = ["#b94b37", "#294f62", "#d69c32", "#3d664c", "#7f443c", "#40517a", "#b36b31"];

type BookField = keyof Book;

const fieldLabel = (field: string) =>
  field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());

export default function Library({ books, bookshelf }: { books: Book[]; bookshelf: Bookshelf }) {
  const [query, setQuery] = useState("");
  const [selectedField, setSelectedField] = useState<BookField | "">("");
  const [selected, setSelected] = useState<Book | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!selected) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [selected]);

  return <main>
    <header className="masthead">
      <div className="brand"><span className="brand-mark">SL</span><span>SINGAPORE LITERATURE<br/>DIGITAL LIBRARY</span></div>
      <span className="room-number">ROOM 01</span>
    </header>

    <section className="intro">
      <p className="eyebrow">YOU&apos;VE FOUND A QUIET CORNER</p>
      <h1>{bookshelf.name}</h1>
      <p className="lede">{bookshelf.description} Pull a volume from the shelf and linger awhile.</p>
      <div className="search-row">
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
        <p><strong>{filtered.length}</strong> {filtered.length === 1 ? "volume" : "volumes"} on view</p>
      </div>
    </section>

    <section className="alcove" aria-live="polite">
      <div className="alcove-top"><span>THE COLLECTION</span><span>ARRANGED BY S/N · ASCENDING</span></div>
      {filtered.length ? <div className="shelf-list">
        {Array.from({ length: Math.ceil(filtered.length / 20) }, (_, shelfIndex) => <div className="shelf" key={shelfIndex}>
          <div className="books">
            {filtered.slice(shelfIndex * 20, shelfIndex * 20 + 20).map((book) => <button
              className="book" key={book.serialNumber} onClick={() => setSelected(book)}
              style={{ "--book-color": colors[(book.serialNumber - 1) % colors.length], "--book-height": `${76 + (book.serialNumber * 7) % 22}%` } as React.CSSProperties}
              aria-label={`Open ${book.title} by ${book.author}`}
            ><span className="book-number">{String(book.serialNumber).padStart(3,"0")}</span><span className="book-title">{book.title}</span></button>)}
          </div>
          <div className="wood-edge" />
        </div>)}
      </div> : <div className="empty"><span>∅</span><h2>No books found</h2><p>Try a different query for {activeField ? fieldLabel(activeField).toLocaleLowerCase() : "this field"}.</p><button onClick={() => setQuery("")}>Clear search</button></div>}
      <div className="floor" />
    </section>

    <footer><span>AN OPEN SHELF FOR SINGAPORE STORIES</span><span>{books.length} VOLUMES · {languageCount} LANGUAGES</span></footer>

    {selected && <div className="backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
      <article className="detail" role="dialog" aria-modal="true" aria-labelledby="book-dialog-title">
        <button ref={closeRef} className="close" onClick={() => setSelected(null)} aria-label="Close book details">×</button>
        <div className="detail-cover" style={{ "--book-color": colors[(selected.serialNumber - 1) % colors.length] } as React.CSSProperties}>
          <span>SINGLIT<br/>COLLECTION</span><strong>{selected.title}</strong><small>{selected.author}</small><b>{String(selected.serialNumber).padStart(3,"0")}</b>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">VOLUME {String(selected.serialNumber).padStart(3,"0")}</p>
          <h2 id="book-dialog-title">{selected.title}</h2>
          <p className="author">by {selected.author}</p>
          <dl>
            <div><dt>Language</dt><dd>{selected.language}</dd></div>
            <div><dt>Location</dt><dd>{selected.locationCode}</dd></div>
            <div><dt>Call number</dt><dd>{selected.callNumber}</dd></div>
            <div><dt>Barcode</dt><dd>{selected.barcode}</dd></div>
            <div><dt>Serial number</dt><dd>{selected.serialNumber}</dd></div>
          </dl>
        </div>
      </article>
    </div>}
  </main>;
}
