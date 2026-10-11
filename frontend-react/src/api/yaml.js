import yaml from 'js-yaml'

/** Default YAML template shown when the Query Builder opens with nothing loaded yet. */
export const DEFAULT_DRAFT_YAML = `queryName: orders.ordersByStatusAndBranch
sql: >
  SELECT orderId, status, total, branchId
  FROM order_projection
  WHERE status = :status AND branchId = :branchId
params:
  status: String
  branchId: int
allowed_roles:
  - senior_DBA
  - chief_DBA
`

/**
 * Parses the YAML text in the editor into the JSON body POST /engine/draft expects:
 * { queryName, sql, params, allowed_roles }.
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
    throw new Error('YAML must define an object with queryName, sql, params, allowed_roles')
  }
  const { queryName, sql, params, allowed_roles } = parsed
  if (!queryName) throw new Error('queryName is required')
  if (!sql) throw new Error('sql is required')
  return {
    queryName,
    sql,
    params: params || {},
    allowed_roles: allowed_roles || [],
  }
}

/**
 * Reconstructs editable YAML from a ValidatedQuery descriptor (returned by draft/drafted/list),
 * for resuming a draft that compiled successfully. Loses nothing the descriptor itself carries,
 * but a draft that failed validation (status DRAFT) has no ValidatedQuery to rebuild from --
 * see QueryBuilderPage for how that case is handled.
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
    allowed_roles: validatedQuery.allowedRoles || [],
  }
  return yaml.dump(doc, { lineWidth: -1 })
}
