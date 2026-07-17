CREATE TABLE IF NOT EXISTS books (
  serial_number INTEGER PRIMARY KEY CHECK (serial_number > 0),
  language TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  location_code TEXT NOT NULL,
  call_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS books_language_idx ON books (language);
CREATE INDEX IF NOT EXISTS books_title_idx ON books (title);
CREATE INDEX IF NOT EXISTS books_author_idx ON books (author);
