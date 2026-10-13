// Thin client for the Query Engine's /engine endpoints. Mirrors the request/response shapes
// in query_engine's dto package exactly -- see publish_query.http and try_query.http for the
// same payloads exercised from an HTTP client.

const BASE_URL = ''

/** Error thrown for any non-2xx engine response; carries the parsed ErrorResponse body. */
export class EngineError extends Error {
  constructor(status, body) {
    super(body?.message || `Request failed with HTTP ${status}`)
    this.status = status
    this.code = body?.error
    this.queryName = body?.queryName
    this.body = body
  }
}

async function request(path, { method = 'POST', body, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  const parsed = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new EngineError(res.status, parsed)
  }
  return parsed
}

/** POST /engine/draft -- { queryName, sql, params } (allowed_roles are chosen later, at publish) */
export function draftQuery(entry, author) {
  return request('/engine/draft', { body: entry, headers: { 'X-Author': author } })
}

/** POST /engine/drafted -- { queryName } */
export function getDrafted(queryName) {
  return request('/engine/drafted', { body: { queryName } })
}

/** POST /engine/simulate -- { queryName, params } */
export function simulateQuery(queryName, params) {
  return request('/engine/simulate', { body: { queryName, params } })
}

/** POST /engine/publish -- { queryName, allowed_roles }. The allowed roles/groups are chosen in
 *  the publish dialog, not at draft time. */
export function publishQuery(queryName, author, allowedRoles) {
  return request('/engine/publish', {
    body: { queryName, allowed_roles: allowedRoles },
    headers: { 'X-Author': author },
  })
}

/** POST /engine/discard -- { queryName } */
export function discardDraft(queryName) {
  return request('/engine/discard', { body: { queryName } })
}

/** POST /engine/list -- { filter, page } */
export function listQueries(filter, page) {
  return request('/engine/list', { body: { filter, page } })
}

/** POST /data-query -- { name, params } */
export function invokeQuery(name, params, roles) {
  return request('/data-query', { body: { name, params }, headers: { 'X-Roles': roles } })
}

/** GET /query-roles -- { realmRoles: [{ name, description }], groups: [{ name, path, description }] }.
 *  The identity catalog the UI offers when choosing allowed roles (publish) or a calling identity (run). */
export function getQueryRoles() {
  return request('/query-roles', { method: 'GET' })
}
