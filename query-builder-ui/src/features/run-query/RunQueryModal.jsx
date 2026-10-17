import { useEffect, useId, useMemo, useState } from 'react'
import Modal from '../../components/Modal.jsx'
import Button from '../../components/Button.jsx'
import Alert, { ErrorAlert } from '../../components/Alert.jsx'
import CopyButton from '../../components/CopyButton.jsx'
import ParamsForm from '../../components/ParamsForm.jsx'
import ResultsTable from '../../components/ResultsTable.jsx'
import Spinner from '../../components/Spinner.jsx'
import { useDomain } from '../../context/DomainContext.jsx'
import { useAbortableRequests } from '../../hooks/useAbortableRequests.js'
import { useQueryRoles } from '../../hooks/useQueryRoles.js'
import { formatDateTime } from '../../utils/format.js'
import { SqlPreview } from '../query-wizard/SimulateStep.jsx'

/**
 * Test-runs a published query through POST /data-query exactly as a client app would: pick the
 * identity to call as (sent as X-Roles), fill the params, run. Loads the published definition
 * fresh on open, so params and allowed roles are never stale.
 */
export default function RunQueryModal({ queryName, onClose }) {
  const { domain, client } = useDomain()
  const run = useAbortableRequests()
  const roles = useQueryRoles()
  const identityId = useId()

  const [load, setLoad] = useState({ status: 'loading', published: null, error: null })
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [identity, setIdentity] = useState('')
  const [paramValues, setParamValues] = useState({})
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState(null) // { rows, ms, identity } | { error, identity }

  useEffect(() => {
    setLoad({ status: 'loading', published: null, error: null })
    run((signal) => client.list({ filter: { queryNamePrefix: queryName } }, { signal }))
      .then((res) => {
        const published = res.items?.find((i) => i.queryName === queryName)?.published
        if (!published) {
          setLoad({ status: 'gone', published: null, error: null })
          return
        }
        setLoad({ status: 'ready', published, error: null })
        setIdentity((current) => current || published.allowedRoles?.[0] || '')
      })
      .catch((error) => setLoad({ status: 'error', published: null, error }))
  }, [client, queryName, run, loadAttempt])

  const published = load.published
  const allowed = useMemo(() => published?.allowedRoles || [], [published])
  const others = useMemo(() => {
    const names = [...roles.realmRoles.map((r) => r.name), ...roles.groups.map((g) => g.name)]
    return names.filter((n) => !allowed.includes(n))
  }, [roles.realmRoles, roles.groups, allowed])

  function invoke() {
    const callAs = identity
    const started = performance.now()
    setRunning(true)
    run((signal) => client.invoke(queryName, paramValues, callAs, { signal }))
      .then((rows) => setOutcome({ rows: Array.isArray(rows) ? rows : [], ms: Math.round(performance.now() - started), identity: callAs }))
      .catch((error) => {
        if (error.code === 'QUERY_NOT_FOUND') setLoad({ status: 'gone', published: null, error: null })
        else setOutcome({ error, identity: callAs })
      })
      .finally(() => setRunning(false))
  }

  const request = `POST ${domain.serviceUrl}/data-query
Content-Type: application/json
X-Roles: ${identity || '<role or group>'}

${JSON.stringify({ name: queryName, params: paramValues }, null, 2)}`

  return (
    <Modal
      size="xl"
      title={`Run ${queryName}`}
      description={`${domain.label} · Calls the published query the way a client app does.`}
      headerExtra={<span className="hidden rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600 sm:inline">{domain.service}</span>}
      onRequestClose={onClose}
      closeOnBackdrop
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {load.status === 'ready' && (
            <Button variant="primary" onClick={invoke} loading={running} disabled={!identity}>
              {outcome ? 'Run again' : 'Run query'}
            </Button>
          )}
        </>
      }
    >
      {load.status === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
          <Spinner /> Loading {queryName}…
        </div>
      )}

      {load.status === 'error' && (
        <ErrorAlert
          error={load.error}
          title="Couldn't load the published query"
          actions={<Button size="sm" onClick={() => setLoadAttempt((n) => n + 1)}>Try again</Button>}
        />
      )}

      {load.status === 'gone' && (
        <Alert variant="warning" title="Not published anymore">
          {queryName} isn&apos;t published on {domain.label} right now, so there&apos;s nothing to run. Close this to refresh the list.
        </Alert>
      )}

      {load.status === 'ready' && (
        <div className="space-y-5 motion-safe:animate-fade-in">
          <p className="text-xs text-slate-500">
            Published by {published.publishedBy} at {formatDateTime(published.publishedAt)}. Allowed:{' '}
            {allowed.map((r) => (
              <span key={r} className="mr-1 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-800 ring-1 ring-emerald-200">
                {r}
              </span>
            ))}
          </p>

          <SqlPreview sql={published.sql} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <div>
              <label htmlFor={identityId} className="mb-1 block text-xs font-medium text-slate-700">
                Call as (X-Roles)
              </label>
              <select
                id={identityId}
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                disabled={running}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
              >
                <optgroup label="Allowed for this query">
                  {allowed.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </optgroup>
                {others.length > 0 && (
                  <optgroup label="Not allowed (expect 403)">
                    {others.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {roles.error && <p className="mt-1 text-xs text-slate-500">Other roles couldn&apos;t be loaded, so only allowed roles are listed.</p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-700">Params</p>
              <ParamsForm params={published.params} values={paramValues} onChange={setParamValues} disabled={running} />
            </div>
          </div>

          <details className="rounded-md ring-1 ring-slate-200">
            <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Request a client app sends
            </summary>
            <div className="border-t border-slate-100 p-3">
              <div className="mb-2 flex justify-end">
                <CopyButton text={request} label="Copy request" />
              </div>
              <pre className="overflow-x-auto rounded-md bg-slate-900 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100">{request}</pre>
            </div>
          </details>

          <RunOutcome outcome={outcome} running={running} allowed={allowed} />
        </div>
      )}
    </Modal>
  )
}

function RunOutcome({ outcome, running, allowed }) {
  if (!outcome) return null
  const dim = running ? 'opacity-50' : ''

  if (outcome.error) {
    const { error, identity } = outcome
    if (error.code === 'FORBIDDEN') {
      const expected = !allowed.includes(identity)
      return (
        <Alert variant="warning" title={`403 FORBIDDEN as ${identity}`} className={dim}>
          {expected
            ? `As expected: ${identity} isn\u2019t in this query\u2019s allowed roles, so the engine refused before running any SQL.`
            : error.message}
        </Alert>
      )
    }
    return <ErrorAlert error={error} title={error.code === 'INVALID_ARGUMENT' ? '400 INVALID_ARGUMENT' : undefined} className={dim} />
  }

  return (
    <section aria-labelledby="run-result-heading" className={`space-y-2 transition-opacity ${dim}`}>
      <div className="flex items-center gap-2">
        <h3 id="run-result-heading" className="text-sm font-semibold text-slate-900">
          200 OK as {outcome.identity}
        </h3>
        <span className="text-xs text-slate-500">
          {outcome.rows.length} row{outcome.rows.length === 1 ? '' : 's'} · {outcome.ms} ms round trip
        </span>
        {running && <Spinner className="h-3.5 w-3.5 text-slate-400" />}
      </div>
      <ResultsTable rows={outcome.rows} emptyText="The call succeeded, but no rows matched these params." />
    </section>
  )
}
