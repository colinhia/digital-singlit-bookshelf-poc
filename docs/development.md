# Development guide

## Prerequisites

- Node.js and npm compatible with Next.js 14. The repository does not pin an exact Node version.
- A Neon/PostgreSQL connection string containing the expected `books` table.
- A WebGL-capable browser for the visual room experiences.
- Docker only when regenerating PlantUML diagrams.

**Implementation anchors:** [`package.json`](../package.json); [`src/data/books.ts`](../src/data/books.ts); [`database/001_create_books.sql`](../database/001_create_books.sql); [`scripts/render-diagrams.sh`](../scripts/render-diagrams.sh).

## Local setup

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local`, apply [`database/001_create_books.sql`](../database/001_create_books.sql) to the target database if needed, and ensure that database has catalogue rows. The repository does not include a migration runner, seed file, or supported import command.

Start development:

```bash
npm run dev
```

Routes:

- `http://localhost:3000/`
- `http://localhost:3000/collection`
- `http://localhost:3000/my-library`

Both room routes require database access even though My Library's changes are session-only, because each starts from the shared catalogue.

**Implementation anchors:** both room page modules and [`src/data/books.ts`](../src/data/books.ts), `getBooks`.

## Commands

| Command | Current behavior |
| --- | --- |
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Creates a production build and performs Next.js TypeScript checking |
| `npm start` | Starts a previously built production server |
| `npm run docs:diagrams` | Renders and checks all PlantUML/SVG pairs using Docker |
| `npm run lint` | Opens interactive Next.js ESLint setup because no ESLint configuration exists |

Do not use `npm run lint` as a non-interactive acceptance check in the current repository.

**Implementation anchors:** [`package.json`](../package.json).

## Repository map

```text
database/                       Books table schema
docs/                           Current-state user and technical documentation
  diagrams/source/              Canonical PlantUML and shared local theme
  diagrams/rendered/            Committed SVG output
public/                         QR and frame-photo assets
scripts/                        Documentation diagram renderer
src/app/                        App Router layouts and pages
src/data/                       Catalogue adapter, bookshelf and placement data
src/experiences/singlit/        Collection controller, scene and book renderer
src/experiences/mylibrary/      Personal-room controller, scene, renderer and types
src/components/scene-assets/    Shared room, furniture, botanical and book assets
src/components/room-decor/      Maintained but inactive archived décor
src/types/                      Shared domain and room types
```

## Safe change points

### Catalogue schema and adapter

Change the SQL schema and `BookRow`/`Book` mapping together. A new non-null column in SQL does not automatically reach the client. Conversely, adding a required `Book` field without selecting and mapping it will fail type checking.

The SingLit search-field selector uses `Object.keys(books[0])`, so a new enumerable `Book` field becomes searchable there automatically. My Library uses the explicit `CATALOGUE_FIELDS` list and search-index object and must be updated deliberately.

**Implementation anchors:** [`database/001_create_books.sql`](../database/001_create_books.sql); [`src/data/books.ts`](../src/data/books.ts); [`src/types/library.ts`](../src/types/library.ts); both experience controllers' search logic.

### Room capacity and placement

Collection placement is derived from [`src/data/room.ts`](../src/data/room.ts), while physical room dimensions and tier heights live in [`src/components/scene-assets/roomLayout.ts`](../src/components/scene-assets/roomLayout.ts). These values must remain compatible: wall capacity should match `tiers × slotsPerTier`, and total capacity should match the generated walls.

My Library derives reading-list and completed capacities in [`src/experiences/mylibrary/layout.ts`](../src/experiences/mylibrary/layout.ts). Change layout, capacity guards, user-facing counts, and documentation together.

### Book visuals

Book size, binding, page color, and lean are deterministic functions of serial number. Cover appearance is also serial-based. Spine typography uses language-specific font families and texture atlases.

Keep Three.js resource cleanup when changing geometry, textures, materials, or render targets. Preserve instancing and memoization unless a measured reason justifies the cost of independent meshes.

**Implementation anchors:** modules under [`src/components/scene-assets/books/`](../src/components/scene-assets/books/); both main book renderer modules.

### Scene interaction

Target acquisition assumes a fixed centre ray. If adding an interactive object:

1. give it stable `userData` or a direct mesh identity;
2. include it in the renderer's reused raycast target list;
3. extend the discriminated target type where needed;
4. compare targets before notifying React state;
5. guard activation by current mode and role;
6. update desktop and coarse-pointer behavior, semantic controls, state diagrams, and user documentation.

**Implementation anchors:** `RealisticBooks` in the SingLit renderer; `CuratedBooks`, `MyLibraryTarget`, and `openTarget` in My Library.

### Archived décor

Archived décor is intentionally absent from live imports. Follow [`src/components/room-decor/archive/README.md`](../src/components/room-decor/archive/README.md): preserve a component's complete rendering and cleanup, register it in the archive, and remove live-room imports. Restoring décor requires an explicit import and mount in an active room composition.

## Diagram workflow

Canonical files are `docs/diagrams/source/*.puml`; SVG files are generated artifacts. `_theme.iuml` contains local shared styling. No diagram uses a network include.

Regenerate:

```bash
npm run docs:diagrams
```

The script:

1. mounts the repository into `plantuml/plantuml:1.2026.4`;
2. renders SVG with syntax prechecking and fail-fast behavior;
3. checks that each `.puml` has one matching `.svg`;
4. reports missing and orphaned outputs without deleting them.

After code changes, update each affected diagram's `Evidence:` comments and the matching Markdown implementation anchors. Re-run the command twice; the second run should leave no diff.

**Implementation anchors:** [`scripts/render-diagrams.sh`](../scripts/render-diagrams.sh); [`docs/diagrams/source/`](diagrams/source/).

## Screenshot capture specification

When a connected browser is available, capture current desktop states through ordinary navigation at a consistent `1440 × 900` CSS-pixel viewport:

1. `/` as `home.png`;
2. `/collection` before entering pointer lock as `collection-filters.png`;
3. `/my-library` immediately after choosing Owner as `my-library-owner.png`;
4. reload `/my-library`, then choose Visitor as `my-library-visitor.png`.

Do not inject state, modify the DOM, or replace database results for capture. Inspect screenshots for loading indicators, unintended pointer-lock prompts, clipping, or exposed browser chrome before committing them.

## Validation

For documentation-only work:

```bash
npm run docs:diagrams
npm run build
git diff --check
```

Also verify relative Markdown links and inspect every changed SVG and screenshot. The production build does not prove that a database connection works at request time, because the two room pages are dynamic; exercise them against a valid configured database.

## Troubleshooting

### `DATABASE_URL is not configured`

Create `.env.local` from `.env.example`, provide a valid connection string, and restart the development server. The error is thrown before the room controller renders.

### Database query fails

Confirm network/database access and apply the exact table schema. The current repository has no route-specific error UI or retry control; inspect the server log for the underlying database error.

### Room shows a WebGL fallback

The controller checks whether a canvas can create `webgl2` or `webgl`. Confirm browser/GPU WebGL support and hardware acceleration. My Library's fallback does not provide an equivalent visible way to activate owner-only scene targets.

### Pointer lock fails

The browser may reject pointer lock when it is not initiated from a user gesture or is restricted by its environment. The controllers return to a non-moving mode; use the visible entry/resume control to try again.

### `npm run lint` waits for input

This is the current expected behavior. There is no ESLint configuration; use `npm run build` for the repository's existing non-interactive type/build validation.

### Diagram rendering cannot start

Confirm Docker is installed and its daemon is running. The first render may need to pull the pinned PlantUML image.
