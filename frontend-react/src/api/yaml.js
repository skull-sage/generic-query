import yaml from 'js-yaml'

/** Default YAML template shown when the Query Builder opens with nothing loaded yet.
 *  allowed_roles are intentionally not part of the draft -- they are chosen later, in the publish
 *  dialog, from the realm roles and groups returned by GET /query-roles. */
export const DEFAULT_DRAFT_YAML = `queryName: orders.ordersByStatusAndBranch
sql: >
  SELECT orderId, status, total, branchId
  FROM order_projection
  WHERE status = :status AND branchId = :branchId
params:
  status: String
  branchId: int
`

/**
 * Parses the YAML text in the editor into the JSON body POST /engine/draft expects:
 * { queryName, sql, params }. allowed_roles are not declared during drafting and are therefore
 * neither required nor validated here -- they are selected at publish time instead.
 * Throws with a readable message if the YAML is malformed or missing required fields.
 */
export function yamlToDraftEntry(yamlText) {
  let parsed
  try {
    parsed = yaml.load(yamlText)
  } catch (err) {
    throw new Error(`Invalid YAML: ${err.message}`)
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('YAML must define an object with queryName, sql, params')
  }
  const { queryName, sql, params } = parsed
  if (!queryName) throw new Error('queryName is required')
  if (!sql) throw new Error('sql is required')
  return {
    queryName,
    sql,
    params: params || {},
  }
}

/**
 * Reconstructs editable YAML from a ValidatedQuery descriptor (returned by draft/drafted/list),
 * for resuming a draft that compiled successfully. allowed_roles are deliberately omitted: they
 * are not part of the draft and are picked in the publish dialog instead.
 */
export function validatedQueryToYaml(queryName, validatedQuery) {
  const paramsMap = {}
  for (const p of validatedQuery.params || []) {
    paramsMap[p.name] = p.type
  }

  const doc = {
    queryName,
    sql: validatedQuery.sql,
    params: paramsMap,
  }
  return yaml.dump(doc, { lineWidth: -1 })
}
