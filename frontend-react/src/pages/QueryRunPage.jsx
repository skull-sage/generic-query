import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Panel from '../components/Panel.jsx'
import Button from '../components/Button.jsx'
import Alert from '../components/Alert.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ParamsForm from '../components/ParamsForm.jsx'
import ResultsTable from '../components/ResultsTable.jsx'
import { invokeQuery, listQueries } from '../api/engineClient.js'
import { useQueryRoles } from '../hooks/useQueryRoles.js'

export default function QueryRunPage() {
  const { queryName: routeQueryName } = useParams()
  const navigate = useNavigate()

  const [queries, setQueries] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)

  const [selectedName, setSelectedName] = useState(routeQueryName || '')
  const [selectedRole, setSelectedRole] = useState('')
  const [paramValues, setParamValues] = useState({})

  const { realmRoles, groups, loading: loadingRoles, error: rolesError } = useQueryRoles()

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
    if (!selected || !selectedRole) return
    setRunning(true)
    setRunError(null)
    try {
      const rows = await invokeQuery(selected.queryName, paramValues, selectedRole)
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
          description="Pick the realm role or group to invoke as; it's sent as the X-Roles header."
        >
          {rolesError ? (
            <Alert variant="error" title="Could not load roles">{rolesError}</Alert>
          ) : loadingRoles ? (
            <p className="text-sm text-slate-500">Loading roles…</p>
          ) : (
            <label className="block max-w-sm">
              <span className="block text-xs font-medium text-slate-700 mb-1">Identity</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
              >
                <option value="">Select a role or group…</option>
                <optgroup label="Realm roles">
                  {realmRoles.map((r) => (
                    <option key={`role:${r.name}`} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Groups">
                  {groups.map((g) => (
                    <option key={`group:${g.name}`} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          )}
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
            {!selectedRole && (
              <p className="text-xs text-slate-500">Pick a role or group above to run the query.</p>
            )}
            <Button variant="primary" onClick={handleRun} disabled={running || !selectedRole}>
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
