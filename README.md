# The SingLit Room

A walk-in digital library built with Next.js. Books are displayed on a tactile shelf in S/N order, searchable across every field, and open into an accessible detail view.

## Run locally

```bash
npm install
npm run dev
```

## Data architecture

- `src/types/library.ts` owns the independent `Book` and `Bookshelf` models.
- `src/data/books.ts` adapts the current Excel mock data into typed records.
- `src/data/bookshelves.ts` configures the room independently of its books.

Deploy the repository directly to Vercel using the Next.js preset.

## Neon database

The application reads books from Neon at request time using `DATABASE_URL`.
The connected database contains the anonymised collection in the public `books` table. The expected schema is documented at `database/001_create_books.sql`.
