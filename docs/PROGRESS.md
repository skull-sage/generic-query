# Query Engine — Progress / Resume Notes

Last updated: 2026-10-13. Snapshot of what's been built so we can pick up later.

## Current state (all working & verified)

The `query_engine` service is **reactive end to end** (WebFlux → reactive service → R2DBC) on
**Java 25**, with a React UI (`frontend-react`) and a Postgres backing store.

### 1. Role-based publishing (realm roles + groups)
- New endpoint `GET /query-roles` returns `{ realmRoles:[{name,description}], groups:[{name,path,description}] }`,
  sourced from seeded `realm_role` / `realm_group` tables.
- `allowed_roles` are **no longer defined at draft time** — chosen at **publish** time instead.
  - `POST /engine/publish` now accepts `allowed_roles` and makes them the RBAC gate; publishing
    with none → `422 NO_ALLOWED_ROLES`.
  - Drafting has no `allowed_roles` field or validation.
- UI: Query Builder opens a modal (`RolePicker`) to pick realm roles/groups before publishing.
  Run page picks a calling identity from a dropdown (optgroups) instead of free text.

### 2. Reactive migration (WebFlux + R2DBC)
- Replaced blocking JDBC with R2DBC via `DatabaseClient`. No in-memory lifecycle state; all in Postgres.
- The **user-supplied SQL template** binds its `:param` markers through `DatabaseClient.bind(...)`
  (native parameter binding, no string concatenation). Bound names = validator-extracted params.
- `publish` is `@Transactional` (reactive) so publish-then-delete-draft is atomic.
- JSONB columns use r2dbc-postgresql's `Json` codec (`JsonbSupport`).

### 3. Java 25
- `build.gradle` toolchain → 25; `Dockerfile` → `eclipse-temurin:25-jre`.
- Local JDK 25 satisfies the toolchain directly (no foojay resolver needed anymore).

## Key files

Backend (`query_engine/src/main/java/com/brac/query/engine/`):
- `web/` — `EngineController`, `DataQueryController`, `QueryRolesController` (all return `Mono<ResponseEntity<…>>`)
- `service/QueryEngineService` — reactive lifecycle orchestration
- `store/` — `DraftStore`, `PublishedQueryRepository`, `QueryRolesRepository`, `JsonbSupport` (all R2DBC)
- `execution/ProjectionStoreExecutor` — reactive parameterized SQL execution
- `dto/PublishRequest` (now has `allowed_roles`), `dto/QueryRolesResponse`

Config / infra:
- `query_engine/build.gradle` — `spring-boot-starter-data-r2dbc` + `org.postgresql:r2dbc-postgresql` (JDBC removed)
- `query_engine/src/main/resources/application.properties` — `spring.r2dbc.*` + pool
- `docker/docker-compose.yml` — engine env `R2DBC_URL`
- `docker/init/02_query_engine_schema.sql` — adds `realm_role` / `realm_group` + seed data
- `*.http` — `publish_query.http` (adds `/query-roles`, `allowed_roles` on publish), `try_query.http`

Frontend (`frontend-react/src/`):
- `components/Modal.jsx`, `components/RolePicker.jsx`, `hooks/useQueryRoles.js`
- `pages/QueryBuilderPage.jsx` (publish modal), `pages/QueryRunPage.jsx` (role dropdown)
- `api/engineClient.js` (`getQueryRoles`, `publishQuery` sends `allowed_roles`), `api/yaml.js` (no allowed_roles)
- `vite.config.js` — proxy for `/query-roles`

## How to run

```bash
# From repo root (bash):
./dry-run.sh                 # Postgres + engine + frontend
# or directly (Windows/pwsh):
docker compose -f docker/docker-compose.yml up -d --build --wait
docker compose -f docker/docker-compose.yml down          # stop (add -v to reset seeded DB)
```
- Engine: http://localhost:8080  UI: http://localhost:5173
- The seeded role tables only (re)load on a fresh DB — use `down -v` then `up` to re-seed.

## Verified
- `/query-roles` → 7 realm roles + 6 groups.
- draft → simulate (`status=SHIPPED, branchId=12` → 3 rows, proves `:param` binding via R2DBC) →
  publish (`allowed_roles:[senior_DBA, data-platform]`) → `/data-query` as `data-platform` → 3 rows.
- `support_agent` → 403 FORBIDDEN; wrong param type → 400 INVALID_ARGUMENT; empty roles → 422; YAML draft → VALIDATED.
- Runs on Java 25.0.4.1 (Netty), startup ~3s.

## Notes / possible next steps
- Auth is still a stand-in: `X-Author` and `X-Roles` headers (no real JWT/identity provider).
- `realm_role`/`realm_group` are a seeded local catalog — swap for the real IdP (e.g. Keycloak) later.
- Already-published queries keep whatever `allowed_roles` they were published with.
- No automated tests yet (`reactor-test` is on the test classpath; `src/test` is empty).
- Frontend bundle is a single large chunk (build warning only) — code-split if it matters.
