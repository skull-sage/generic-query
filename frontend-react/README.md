# Query Engine UI

React + Tailwind CSS v4 front end for the `query_engine` backend: draft a query as YAML, simulate
it against the real Postgres-backed projection store, then publish it for client apps to call.

## Pages

- **Query Builder** (`/builder`, `/builder/:queryName`) — a three-step flow:
  1. **Draft** — a syntax-highlighted YAML editor for the query entry (`queryName`, `sql`,
     `params`, `allowed_roles`). Calls `POST /engine/draft`.
  2. **Simulate** — a form generated from the drafted query's declared params, runs the query
     against the real projection store and shows the returned rows plus latency / rows scanned /
     PostgreSQL planner cost. Calls `POST /engine/simulate`.
  3. **Publish** — once a draft has been simulated, publish it under an owning team. Calls
     `POST /engine/publish`.
- **Query List** (`/queries`) — every query with an open draft and/or a published version, with
  `All` / `Drafted` / `Published` tabs. Calls `POST /engine/list`.

## Running

Start the backend first (from the workspace root):

```bash
./dry-run.sh
```

Then, in this directory:

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/engine/*` and `/data-query` to
`http://localhost:8080` (see `vite.config.js`), so no CORS configuration is needed.

## Build

```bash
npm run build
```

Outputs a static bundle to `dist/`.
