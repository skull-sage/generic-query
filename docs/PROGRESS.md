# Query Engine — Progress / Resume Notes

Last updated: 2026-10-17. Snapshot of what's been built so we can pick up later.

## Architecture

The enterprise is event-driven microservices following DDD and CQRS. `query-engine` is the shared read-side
abstraction; each domain has its own query service that embeds it and owns its own projection store:

| Project | Kind | Port | Database (host port) |
| --- | --- | --- | --- |
| `query-engine` | Java library (no app, no image) | – | – |
| `order-query` | Spring Boot service, depends on `query-engine` | 8081 | `order_query` Postgres (5433) |
| `inventory-query` | Spring Boot service, depends on `query-engine` | 8082 | `inventory_query` Postgres (5434) |
| `query-builder-ui` | React UI, talks to the selected domain's service | 5173 | – |

- **Independent Gradle builds.** `query-engine`, `order-query` and `inventory-query` each have their own `settings.gradle`,
  `build.gradle` and wrapper; there is no root build. `query-engine` is published locally
  (`cd query-engine && ./gradlew publishToMavenLocal`) as `com.brac.query:query-engine:0.0.1-SNAPSHOT`, and each service
  resolves it from `mavenLocal()` (restricted to the `com.brac.query` group).
- **query-engine wires itself in** via `QueryEngineAutoConfiguration` (registered in
  `META-INF/spring/...AutoConfiguration.imports`): its controllers (`/engine/*`, `/data-query`, `/query-roles`), service,
  stores and error handling. A service only supplies `spring.r2dbc.*` and its projection tables.
- **query-engine owns its tables.** `query-engine/src/main/resources/query-engine/schema.sql` (drafts, published queries,
  realm roles/groups catalog) runs on every service startup; all statements are idempotent. Disable with
  `query-engine.schema.initialize=false`. Each domain's projection tables are seeded by its own `docker/init`.
- **Separate docker compose per service** (`<service>/docker/docker-compose.yml`): its own Postgres + the service container,
  independent networks and lifecycles.
- Reactive end to end (WebFlux → reactive service → R2DBC), Java 25, no in-memory lifecycle state.

## Seed data (for WHERE-clause variance)

- `order_projection` (24 rows): `status` (7 values incl. QUEUED, IN_PROGRESS), `branchId` (6), `channel` (WEB, MOBILE, POS,
  CALL_CENTER), `customerTier` (GOLD, SILVER, BRONZE), `orderDate`, `total`.
- `inventory_projection` (24 rows, one per SKU per warehouse): `status` (IN_STOCK, LOW_STOCK, OUT_OF_STOCK, BACKORDERED,
  DISCONTINUED), `warehouse_id` (4), `category` (5), `supplier_id` (5), `quantity_on_hand` vs `reorder_level`, `unit_price`,
  `last_restocked`.

## Engine API notes

- `allowed_roles` are chosen at **publish** time (`POST /engine/publish {queryName, allowed_roles}`; none → 422
  `NO_ALLOWED_ROLES`). Drafts carry no roles.
- `DraftResponse` now also returns `entry` (`{sql, params}` as submitted, present even when validation failed) and
  `simulated`, so an editor can resume any draft and knows whether it can be published.

## UI

- Header domain switcher; first visit asks for a domain, later visits reopen the last one. Switching remounts the workspace.
- Main view: query list with All / Draft / Published tabs and name search.
- Query wizard dialog (Draft → Simulate → Publish) for new queries and for a list item's Edit / Simulate / Publish.
  Recovers when the server's draft has moved on (gone, re-saved elsewhere, no longer simulated) by sending the user to the
  step that fixes it. All requests are cancelled when a dialog closes or the domain changes.
- Run dialog for published queries: pick the calling identity (allowed roles, or others to see the 403), fill params, run.

## How to run

```bash
./dry-run.sh                    # both domain stacks + UI, opens http://localhost:5173
./dry-run.sh --domain order     # one domain only (repeatable)
./dry-run.sh --no-frontend      # services only; use <service>/http/*.http
./stop.sh                       # stop everything and reset the databases
```

The UI dev server is managed by `scripts/ui-dev-server.sh` (sourced by both scripts): it runs `vite` in its own process
group and is stopped by killing the whole group (TERM, then KILL after 5s). `stop.sh` also stops any untracked dev
server of this UI (e.g. a manual `npm run dev`), recognized by its working directory being `query-builder-ui`; other
programs are never touched. `dry-run.sh` reclaims port 5173 from such leftovers, refuses if another program holds it,
and stops the dev server it started if it fails or is interrupted before the UI is ready.

Without the script:

```bash
(cd query-engine && ./gradlew publishToMavenLocal)
(cd order-query && ./gradlew bootJar) && docker compose -f order-query/docker/docker-compose.yml up -d --build --wait
(cd inventory-query && ./gradlew bootJar) && docker compose -f inventory-query/docker/docker-compose.yml up -d --build --wait
(cd query-builder-ui && npm run dev)
```

## Verified (2026-10-17)

- Both services build independently against the locally published query-engine; each database gets the engine tables
  plus only its own projection.
- Order: draft → simulate (WEB/GOLD → 6 rows) → publish to `[data_analyst, finance]` → invoke as finance → 200; as
  warehouse_manager → 403.
- Inventory: JSON and YAML drafts, wrong param type → 400, simulate WH-DHK/IN_STOCK → 5 rows, restock-by-category → 4 rows,
  publish without roles → 422, publish → invoke WH-CTG/LOW_STOCK → 2 rows.
- Isolation: an Order query name on inventory-query → 404; each service lists only its own queries.
- Restarting a service container keeps its drafts and published queries.
- UI: production build passes; dev-server proxy reaches both services; a stopped service surfaces as `SERVICE_UNREACHABLE`.
  The dialogs themselves have not been exercised in a browser yet.

## Possible next steps

- Auth is still a stand-in: `X-Author` and `X-Roles` headers. `/data-query` defaults to `senior_DBA` without `X-Roles`.
- The roles catalog is seeded locally per database; swap for the real IdP (e.g. Keycloak) later.
- Publish `query-engine` to a shared Maven repository instead of Maven Local, so services build on other machines and in CI.
- No automated tests yet.
