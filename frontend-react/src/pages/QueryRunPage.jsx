import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Panel from '../components/Panel.jsx'
import Button from '../components/Button.jsx'
import Alert from '../components/Alert.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ParamsForm from '../components/ParamsForm.jsx'
import ResultsTable from '../components/ResultsTable.jsx'
import { invokeQuery, listQueries } from '../api/engineClient.js'

// Stand-in for a real auth stack: the caller types in the role(s) they want to invoke as,
// the same manual X-Roles convention try_query.http already exercises.
const DEFAULT_ROLES = 'senior_DBA'

export default function QueryRunPage() {
  const { queryName: routeQueryName } = useParams()
  const navigate = useNavigate()

  const [queries, setQueries] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)

  const [selectedName, setSelectedName] = useState(routeQueryName || '')
  const [rolesInput, setRolesInput] = useState(DEFAULT_ROLES)
  const [paramValues, setParamValues] = useState({})

  const [result, setResult] = useState(null)
  const [runError, setRunError] = useState(null)
  const [running, setRunning] = useState(false)

  // Load the published query catalog once; this is also where params/sql/allowedRoles for
  // the picked query come from (see ListResponse.PublishedSummary).
  useEffect(() => {
    let cancelled = false
    setLoadingList(true)
    setListError(null)
    listQueries(undefined, { size: 200 })
      .then((res) => {
        if (cancelled) return
        const published = (res.items || []).filter((item) => item.published)
        setQueries(published)
      })
      .catch((err) => {
        if (!cancelled) setListError(err.message || String(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (routeQueryName) {
      setSelectedName(routeQueryName)
    }
  }, [routeQueryName])

  const selected = useMemo(
    () => queries.find((q) => q.queryName === selectedName) || null,
    [queries, selectedName]
  )

  function handleSelect(name) {
    setSelectedName(name)
    setParamValues({})
    setResult(null)
    setRunError(null)
    navigate(name ? `/run/${encodeURIComponent(name)}` : '/run', { replace: true })
  }

  async function handleRun() {
    if (!selected) return
    setRunning(true)
    setRunError(null)
    try {
      const roles = rolesInput
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0)
        .join(',')
      const rows = await invokeQuery(selected.queryName, paramValues, roles)
      setResult(rows)
    } catch (err) {
      setRunError(err)
    } finally {
      setRunning(false)
    }
  }

  const params = selected?.published?.params || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Run Query</h1>
        <p className="text-sm text-slate-500">Call a published query with sample params and roles, and see the data it returns.</p>
      </div>

      <Panel title="1. Pick a published query">
        {listError && <Alert variant="error" title="Could not load queries">{listError}</Alert>}
        {loadingList ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : queries.length === 0 ? (
          <p className="text-sm text-slate-500">No published queries yet. Publish one from the Query Builder first.</p>
        ) : (
          <div className="space-y-3">
            <label className="block max-w-md">
              <span className="block text-xs font-medium text-slate-700 mb-1">Published query</span>
              <select
                value={selectedName}
                onChange={(e) => handleSelect(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
              >
                <option value="">Select a query…</option>
                {queries.map((q) => (
                  <option key={q.queryName} value={q.queryName}>
                    {q.queryName}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                <StatusBadge status="PUBLISHED" />
                <span>allowed roles: {selected.published.allowedRoles?.join(', ') || 'none'}</span>
              </div>
            )}
          </div>
        )}
      </Panel>

      {selected && (
        <Panel
          title="2. Call as"
          description="Stand-in for real auth: comma-separated role(s) sent as the X-Roles header."
        >
          <label className="block max-w-sm">
            <span className="block text-xs font-medium text-slate-700 mb-1">Roles</span>
            <input
              type="text"
              value={rolesInput}
              onChange={(e) => setRolesInput(e.target.value)}
              placeholder="e.g. senior_DBA, chief_DBA"
              className="block w-full rounded-md border-0 py-1.5 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            />
          </label>
        </Panel>
      )}

      {selected && (
        <Panel title="3. Params" description="Values to bind into the published query's sql template.">
          <ParamsForm params={params} values={paramValues} onChange={setParamValues} />
        </Panel>
      )}

      {selected && (
        <Panel title="4. Run">
          <div className="space-y-4">
            {runError && (
              <Alert variant="error" title={runError.code || 'Call failed'}>
                {runError.message}
              </Alert>
            )}
            <Button variant="primary" onClick={handleRun} disabled={running}>
              {running ? 'Running…' : 'Run query'}
            </Button>

            {result && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-slate-500">{result.length} row{result.length === 1 ? '' : 's'} returned.</p>
                <ResultsTable rows={result} />
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}
