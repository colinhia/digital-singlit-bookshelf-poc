# Digital SingLit Bookshelf PoC

A Next.js proof of concept for discovering and curating Singapore literature in two interactive 3D rooms:

- **The SingLit Collection** (`/collection`) presents the shared catalogue across three walls. Visitors can filter books, inspect details, move up to five books to a display table, and open an NLB mobile-app QR screen.
- **My Library** (`/my-library`) demonstrates a visit-scoped personal reading room. An owner can curate an in-memory reading list, current read, completed shelf, reviews, photograph, and flowers; a visitor can browse a deterministic read-only example.

The catalogue is read from Neon on every request to either room. Personal curation, reviews, room decoration, and the collection table are browser-memory state only and are lost on reload. Owner and visitor are demonstration roles, not authenticated accounts.

## Run locally

The repository does not pin a Node.js version. Use a version compatible with Next.js 14, then:

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL in .env.local
npm run dev
```

The database must contain the `books` table described in [`database/001_create_books.sql`](database/001_create_books.sql). The repository supplies the schema but no migration runner or seed/import command.

Useful commands:

```bash
npm run build
npm start
npm run docs:diagrams
```

`npm run lint` currently starts Next.js's interactive ESLint setup because the repository has no ESLint configuration; it is not an automated validation command.

## Documentation

- [Documentation index](docs/README.md)
- [User guide](docs/user-guide.md)
- [Architecture](docs/architecture.md)
- [Data model and state](docs/data-and-state.md)
- [Development guide](docs/development.md)
- [Deployment and operations](docs/deployment.md)

## Current boundaries

This is a current-state prototype, not a production library account system:

- no authentication, user accounts, application API routes, or catalogue write path;
- no persistence for My Library or the collection display table;
- no health endpoint or application-level error screen for database failures;
- no repository-managed database migrations, catalogue import, or automated ESLint configuration;
- WebGL is required for the visual rooms, with limited non-visual navigation provided by hidden DOM controls.

The documented deployment target is Vercel with Neon, but the repository contains a standard Next.js application rather than provider-specific infrastructure configuration.
