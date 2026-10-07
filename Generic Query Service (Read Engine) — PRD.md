# Generic Query Service (Read Engine) — PRD

Oct 6, 2026 · @Anirudhya Sarker

## Overview

The current system runs on domain-driven microservices with CQRS: each bounded context owns its write model and publishes events that build one or more read-side projections (SQL tables, Elasticsearch indices, document stores). Today, any service that needs ad-hoc or cross-aggregate reads either hand-rolls a REST endpoint per use case or queries projection stores directly — duplicating query logic, leaking storage internals to clients, and scattering authorization checks across services.

The Generic Query Service is a dedicated read-side gateway: it accepts dynamic queries against registered domain projections, compiles them into the native query of each backing store, and enforces role-based access control at the field and row level before returning results. It owns no write logic and never touches a bounded context's command side.

## Goals and non-goals

Goals:

- Let any authorized client query domain projections dynamically (filter, sort, paginate, select fields, join across read models) without a new endpoint per use case.
- Enforce role-based access control centrally, at field and row level, so each projection owner stops reimplementing it.
- Stay stable under CQRS's natural churn — new projections, schema changes, replays — without breaking existing clients.
- Keep read-model ownership with bounded contexts: the service queries published projections, it does not own or write them.

Non-goals:

- Replacing bounded-context APIs for commands or domain-specific business logic.
- Ad-hoc writes or synchronous calls into write models.
- Replicating BI/OLAP tooling or long-running batch analytics — this is for low-latency operational reads.

## Requirements

### Functional

- Accept a structured, declarative query (filter, sort, pagination, field selection, cross-projection joins where projections share a key) over one or more registered domain projections.
- Resolve the query against each projection's native store (Postgres, Elasticsearch, Mongo, etc.) through a pluggable adapter, without clients knowing the storage technology.
- Enforce RBAC per request — which projections, fields, and rows a caller's role(s) may see — evaluated before data leaves the service.
- Reject queries outside an allow-listed shape (no arbitrary joins, no unbounded scans) to protect backing stores.

### Non-functional

- p95 query latency within 20ms of a direct store query (compiler and authorization overhead).
- Horizontally scalable, stateless compute; all state lives in the projection stores.
- Auditable: every query logged with caller identity, roles, projections touched, and rows/fields returned or denied.
- A new projection can be onboarded by registering its schema, with no deploy of the core engine.

## Candidate approaches

Three modern, production-proven approaches fit a generic read engine over CQRS projections.

**1. Federated GraphQL gateway.** Each bounded context exposes a GraphQL subgraph over its projections; a gateway (Apollo Federation, GraphQL Mesh) composes them into one schema. RBAC is enforced through field-level directives (`@requiresRole`) resolved per request.

**2. OData-style generic REST API.** A single REST surface implements OData v4 semantics (`$filter`, `$select`, `$expand`, `$orderby`) over registered projections. RBAC is enforced by a policy engine (OPA, Cedar) evaluated against the parsed query before execution.

**3. Policy-compiled query DSL service.** A small, purpose-built query language (JSON-based, similar to MongoDB's query syntax) is compiled per projection into native store queries by pluggable adapters. RBAC is an attribute-based policy (OPA/Rego) enforced at compile time — filtering clauses and fields before the query ever reaches a store.

## Comparative power table

The policy-compiled query DSL rates highest on fit for this problem; GraphQL federation rates highest on client tooling and ecosystem maturity.

| Dimension | GraphQL federation | OData REST API | Policy-compiled query DSL |
| --- | --- | --- | --- |
| Query flexibility | High — nested, typed queries | Medium — flat filters, `$expand` | High — schema-driven, built for this |
| Field/row-level RBAC | Medium — per-field directives | Medium — policy on parsed query | High — compiled into the native query, can't be bypassed |
| Polyglot store support | Medium — resolver code per subgraph | Medium — one adapter per store | High — adapter layer is the core design |
| Client ergonomics | High — typed schema, broad tooling | High — open standard, widely known | Medium — custom DSL, needs docs/SDK |
| Operational complexity | High — gateway plus N subgraphs | Medium — one service, one spec | Medium — one service, custom compiler |
| Ecosystem maturity | High — Apollo, broad adoption | High — OData is an OASIS standard | Low — bespoke, more to build and maintain |
| Fit for CQRS projections | Medium — built for APIs, not read models | Medium — general purpose | High — designed around projection querying |
|  |  |  |  |

## Recommendation

Build the **policy-compiled query DSL service** (approach 3). It is the only option designed around compiling a declarative query into native, polyglot-store queries with RBAC baked into the compiled plan rather than bolted on after — the table above rates it highest on exactly the two dimensions this PRD's goals depend on: polyglot projection support and RBAC that cannot be bypassed downstream.

Expose GraphQL or OData as a thin adapter later if client demand for standard tooling justifies the extra surface — the compiler and policy layer stay the single source of truth either way.

&#91;embedded content: query path · 1 decision, 1 async feed\]

A query never reaches a projection store until the RBAC decision clears it; projections themselves are built asynchronously by event consumers, independent of the query path.

## Role-based access control

Roles are resolved once per request from the caller's identity token (JWT claims or an upstream identity service) and passed into the policy engine alongside the parsed query, before compilation.

- **Projection-level**: a role must be explicitly granted access to a projection; unlisted projections are denied by default.
- **Field-level**: a policy can redact or omit specific fields per role (e.g. a support role sees an order but not its payment details).
- **Row-level**: a policy can inject filter clauses scoped to the caller (e.g. a branch manager role only sees rows where `branchId` matches their assignment).
- **Policy source**: policies are authored as OPA/Rego (or an equivalent ABAC engine) and versioned alongside the projection registry, not hardcoded in the service.
- **Enforcement point**: policies run inside the query compiler, before any native query reaches a store — a denied field or row is never fetched, not filtered out after the fact.

## Query API

A single `POST /query` endpoint takes a JSON query body naming one or more registered projections, a filter tree, field selection, sort, and pagination. The caller's role never appears in the body — it comes from the auth token.

```json
{
  "from": "order_projection",
  "select": ["orderId", "status", "total", "customer.name"],
  "where": {
    "and": [
      { "field": "status", "op": "eq", "value": "SHIPPED" },
      { "field": "createdAt", "op": "gte", "value": "2026-09-01" }
    ]
  },
  "orderBy": [{ "field": "createdAt", "dir": "desc" }],
  "page": { "limit": 50, "cursor": null }
}
```

The response carries the matched rows, a `nextCursor`, and the set of fields the engine redacted for the caller's role (so clients can tell a missing field from a null one):

```json
{
  "rows": [{ "orderId": "O-1042", "status": "SHIPPED", "total": 128.50 }],
  "nextCursor": "eyJvZmZzZXQiOjUwfQ",
  "redactedFields": ["customer.name"]
}
```

### Adapter examples (GraphQL and OData)

If the optional adapters ship, each one parses its own syntax into the same JSON DSL above. Compilation and RBAC stay in one place, so a client gets the same rows and the same redactions whichever surface it calls. Both examples below are the "shipped orders since 1 Sep" query from above.

**GraphQL**: one schema type per registered projection, generated from the projection registry.

```graphql
query {
  orders(
    where: { status: { eq: SHIPPED }, createdAt: { gte: "2026-09-01" } }
    orderBy: { createdAt: DESC }
    first: 50
    after: null
  ) {
    nodes { orderId status total customer { name } }
    pageInfo { endCursor hasNextPage }
  }
}
```

Redacted fields come back as `null`, with their paths listed in `extensions.redactedFields` so clients can still tell redacted from empty. `pageInfo.endCursor` carries the DSL's `nextCursor`.

**OData**: one entity set per registered projection.

```http
GET /odata/orders
  ?$select=orderId,status,total
  &$expand=customer($select=name)
  &$filter=status eq 'SHIPPED' and createdAt ge 2026-09-01
  &$orderby=createdAt desc
  &$top=50
```

The next page is returned as `@odata.nextLink`, which wraps the DSL cursor. Redacted fields are left out of each entity and listed in a custom `@query.redactedFields` annotation on the response. Only the operators the DSL supports are accepted; anything else (e.g. `$apply`, lambda `any`/`all`) is rejected with a 400.

## Non-functional considerations

| Concern | Target | Mechanism |
| --- | --- | --- |
| Performance | p95 within 20ms of a direct store query | Query plans compiled and cached per projection schema; no N+1 fan-out across stores |
| Scalability | Linear scale-out under load | Stateless compute; horizontal pod autoscaling; all state in projection stores |
| Security | No query reaches a store before RBAC resolves | Policy evaluated at compile time, inside the service, never downstream |
| Observability | Every denial and slow query traceable | Structured audit log (caller, role, projection, fields, rows) plus per-query tracing |
| Schema evolution | New or changed projections ship without a core deploy | Projection registry is schema-driven and versioned independently of the engine |

## Rollout plan

| Phase | Focus | Key deliverables | Exit criteria |
| --- | --- | --- | --- |
| 1. Foundation | Core engine and one projection | Query DSL, compiler, store adapter for one projection, projection registry | A single projection queryable end to end, no RBAC yet |
| 2. RBAC | Policy enforcement | OPA/Rego integration, field and row-level policies, audit log | Denied queries never reach a store; audit log captures every request |
| 3. Expansion | Multi-projection, multi-store | Adapters for remaining store types, cross-projection joins, onboarding docs | Three or more bounded contexts self-serve a new projection without a core deploy |
| 4. Hardening | Production readiness | Load testing to the p95 target, rate limiting, dashboards, runbooks | Meets latency and scale targets under production-representative load |

## Risks and open questions

- **Query DSL adoption**: a bespoke DSL has no off-the-shelf client tooling; mitigate with a typed SDK generated from the projection registry.
- **Policy drift**: RBAC policies owned separately from projection schemas can fall out of sync; mitigate by versioning both together in the same registry.
- **Store adapter sprawl**: each new storage technology needs a new adapter; mitigate by capping supported stores to what bounded contexts already use.
- **Unbounded query abuse**: a flexible filter tree can still express expensive queries; mitigate with per-projection cost limits enforced at compile time.

Open questions:

- [ ] Which identity provider issues the role claims the policy engine reads?
- [ ] Do any existing projections need backward-compatible REST endpoints during migration?
- [ ] What is the SLA for onboarding a new bounded context's projection?
