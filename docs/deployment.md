# Deployment and operations

## Current deployment model

The documented target is a Vercel deployment using the Next.js preset and a Neon database. The repository does not include infrastructure as code, a `vercel.json`, a declared edge runtime, or environment provisioning automation.

The deployment responsibilities are:

- serve the static home route, public images, fonts, CSS, and client bundles;
- execute `/collection` and `/my-library` dynamically;
- expose `DATABASE_URL` to the server runtime only;
- allow outbound access from that runtime to Neon;
- load the Vercel Analytics component in the browser.

See the [deployment diagram](architecture.md#deployment-view) for the current system boundary.

**Implementation anchors:** [`src/app/layout.tsx`](../src/app/layout.tsx); both room page modules' `dynamic = "force-dynamic"`; [`src/data/books.ts`](../src/data/books.ts); repository root configuration.

## Database preparation

Apply [`database/001_create_books.sql`](../database/001_create_books.sql) to the target Neon/PostgreSQL database. It safely creates the table and indexes if they do not exist, but it does not alter an incompatible existing schema and does not load catalogue rows.

The application account needs permission to execute:

```sql
SELECT serial_number, language, barcode, title, author, location_code, call_number
FROM books
ORDER BY serial_number ASC;
```

The application currently performs no `INSERT`, `UPDATE`, or `DELETE`.

Deployment must supply:

```text
DATABASE_URL=postgresql://...
```

Keep the connection string out of client-exposed variables and committed files. `getBooks` reads the unprefixed environment variable from server execution.

**Implementation anchors:** [`database/001_create_books.sql`](../database/001_create_books.sql); [`src/data/books.ts`](../src/data/books.ts), `getBooks`; [`.env.example`](../.env.example).

## Build and release

From a clean installation:

```bash
npm install
npm run build
```

The build validates TypeScript through Next.js and produces:

- a static `/` route;
- dynamic `/collection` and `/my-library` routes.

The room routes are not database-health checks during build because their forced-dynamic pages execute per request.

Before release:

1. verify the schema and catalogue content in the target database;
2. configure `DATABASE_URL` for the intended environment;
3. deploy the repository with the Next.js preset;
4. request all three routes;
5. confirm both room routes return catalogue content;
6. exercise one desktop and one coarse-pointer interaction path;
7. confirm public photos and the QR image load.

`npm run lint` is not part of the current automated release check because it opens interactive ESLint setup.

**Implementation anchors:** [`package.json`](../package.json); route page modules; [`public/`](../public/).

## Runtime behavior

Every request to either room:

1. requires a configured connection string;
2. opens a Neon serverless SQL client through that string;
3. selects the complete catalogue in serial-number order;
4. maps it to `Book[]`;
5. sends the array to the selected client experience.

There is no catalogue cache in application code, pagination at the database layer, stale-data fallback, retry loop, or route-specific error component. My Library catalogue result paging happens only after the full array reaches the browser.

Personal-room actions and SingLit table selections generate no server requests and cannot be recovered after refresh or navigation.

**Implementation anchors:** [`src/data/books.ts`](../src/data/books.ts); both room pages; controller state and search derivations.

## Failure modes

| Failure | Current effect |
| --- | --- |
| Missing `DATABASE_URL` | `getBooks` throws and the room does not render |
| Database/network/query error | Error propagates through Next.js framework handling |
| Empty catalogue | Rooms receive an empty array; collection search fields are disabled and visitor demo lists are empty |
| Book serial outside `1..600` | Record is returned and may appear in DOM lists, but the SingLit shelf renderer omits it |
| No WebGL context | The controller renders its fallback rather than a canvas |
| Pointer-lock rejection/error | Controller remains in or returns to a resumable/non-moving mode |
| Public image missing | The associated QR, preview, or texture cannot render correctly |
| Analytics unavailable | No application recovery logic is present; core catalogue code does not depend on an analytics response |

**Implementation anchors:** `getBooks`; `getProfiledBooks`; both controllers' WebGL and pointer-lock effects; public asset references; root `Analytics` mount.

## Observability and health

The only configured telemetry component is Vercel Analytics. The application has:

- no custom logs beyond framework/runtime errors;
- no health or readiness endpoint;
- no database health probe;
- no error-reporting SDK;
- no user/session identifier;
- no frame-rate or WebGL performance telemetry.

Operational checks therefore rely on hosting logs, Neon service visibility, Vercel Analytics where available, and direct route smoke tests. Do not interpret analytics availability as evidence that Neon queries or WebGL rendering are healthy.

**Implementation anchors:** [`src/app/layout.tsx`](../src/app/layout.tsx); absence of route handlers, health pages, monitoring SDKs, and logging modules.

## Data and privacy boundary

The README identifies the catalogue as anonymised. Catalogue fields are delivered to the browser in full for both experiences, including barcode and location/call-number data shown in detail dialogs.

The application does not send personal-library choices or review text to its own server, but those values exist in page memory for the visit. There is no account, consent, retention, export, or deletion workflow because no personal record is persisted.

The NLB QR image is served by the application. Any action after scanning occurs outside this codebase.

**Implementation anchors:** [`README.md`](../README.md); `Book` detail dialog markup in both controllers; My Library state declarations; borrow-page markup.
