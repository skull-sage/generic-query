import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Panel from '../components/Panel.jsx'
import Button from '../components/Button.jsx'
import Alert from '../components/Alert.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import YamlEditor from '../components/YamlEditor.jsx'
import ParamsForm from '../components/ParamsForm.jsx'
import ResultsTable from '../components/ResultsTable.jsx'
import MetricsStrip from '../components/MetricsStrip.jsx'
import Modal from '../components/Modal.jsx'
import RolePicker from '../components/RolePicker.jsx'
import { DEFAULT_DRAFT_YAML, validatedQueryToYaml, yamlToDraftEntry } from '../api/yaml.js'
import { discardDraft, draftQuery, getDrafted, publishQuery, simulateQuery } from '../api/engineClient.js'

// Stand-in identity until a real auth stack exists -- matches the X-Author header the backend
// already expects (see EngineController).
const AUTHOR = 'ui-author@bracits.com'

const STEP = { DRAFT: 1, SIMULATE: 2, PUBLISH: 3 }

export default function QueryBuilderPage() {
  const { queryName: routeQueryName } = useParams()
  const navigate = useNavigate()

  const [yamlText, setYamlText] = useState(DEFAULT_DRAFT_YAML)
  const [draft, setDraft] = useState(null) // last DraftResponse
  const [draftError, setDraftError] = useState(null)
  const [drafting, setDrafting] = useState(false)

  const [paramValues, setParamValues] = useState({})
  const [simulateResult, setSimulateResult] = useState(null)
  const [simulateError, setSimulateError] = useState(null)
  const [simulating, setSimulating] = useState(false)

  const [publishResult, setPublishResult] = useState(null)
  const [publishError, setPublishError] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState([])

  // Resume an existing draft when navigated here from the Query List ("Edit draft").
  useEffect(() => {
    if (!routeQueryName) return
    let cancelled = false
    getDrafted(routeQueryName)
      .then((res) => {
        if (cancelled) return
        setDraft(res)
        if (res.validatedQuery) {
          setYamlText(validatedQueryToYaml(res.queryName, res.validatedQuery))
        }
      })
      .catch(() => {
        /* no open draft for this name -- leave the editor at its default template */
      })
    return () => {
      cancelled = true
    }
  }, [routeQueryName])

  const activeStep = publishResult
    ? STEP.PUBLISH
    : simulateResult
      ? STEP.SIMULATE
      : draft?.status === 'VALIDATED'
        ? STEP.SIMULATE
        : STEP.DRAFT

  async function handleDraft() {
    setDrafting(true)
    setDraftError(null)
    setSimulateResult(null)
    setSimulateError(null)
    setPublishResult(null)
    setPublishError(null)
    try {
      const entry = yamlToDraftEntry(yamlText)
      const result = await draftQuery(entry, AUTHOR)
      setDraft(result)
      setParamValues({})
      if (!routeQueryName) {
        navigate(`/builder/${result.queryName}`, { replace: true })
      }
    } catch (err) {
      setDraftError(err.message || String(err))
    } finally {
      setDrafting(false)
    }
  }

  async function handleSimulate() {
    if (!draft) return
    setSimulating(true)
    setSimulateError(null)
    try {
      const result = await simulateQuery(draft.queryName, paramValues)
      setSimulateResult(result)
    } catch (err) {
      setSimulateError(err)
    } finally {
      setSimulating(false)
    }
  }

  function openPublishModal() {
    setPublishError(null)
    setSelectedRoles([])
    setShowPublishModal(true)
  }

  async function handlePublish() {
    if (!draft || selectedRoles.length === 0) return
    setPublishing(true)
    setPublishError(null)
    try {
      const result = await publishQuery(draft.queryName, AUTHOR, selectedRoles)
      setPublishResult(result)
      setShowPublishModal(false)
    } catch (err) {
      setPublishError(err)
    } finally {
      setPublishing(false)
    }
  }

  async function handleDiscard() {
    if (!draft) return
    await discardDraft(draft.queryName).catch(() => {})
    resetAll()
  }

  function resetAll() {
    setYamlText(DEFAULT_DRAFT_YAML)
    setDraft(null)
    setDraftError(null)
    setParamValues({})
    setSimulateResult(null)
    setSimulateError(null)
    setPublishResult(null)
    setPublishError(null)
    setShowPublishModal(false)
    setSelectedRoles([])
    navigate('/builder', { replace: true })
  }

  const params = draft?.validatedQuery?.params || []
  const canSimulate = draft?.status === 'VALIDATED'
  const canPublish = canSimulate && simulateResult !== null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Query Builder</h1>
        <p className="text-sm text-slate-500">Draft a query, simulate it against real data, then publish it for client apps to call.</p>
      </div>

      <Stepper activeStep={activeStep} />

      <Panel
        title="1. Draft"
        description="Write the query entry as YAML: queryName, sql, params. Allowed roles are chosen when you publish."
        actions={draft && <StatusBadge status={draft.status} />}
      >
        <div className="space-y-4">
          <YamlEditor value={yamlText} onChange={setYamlText} />
          {draftError && <Alert variant="error" title="Could not draft">{draftError}</Alert>}
          {draft && draft.status === 'DRAFT' && draft.errors?.length > 0 && (
            <Alert variant="warning" title="Draft saved, but validation failed">
              <ul className="list-disc pl-5 space-y-0.5">
                {draft.errors.map((e, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs">{e.code}</span>
                    {e.param && <span className="font-mono text-xs"> ({e.param})</span>}: {e.message}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          {draft && draft.status === 'VALIDATED' && (
            <Alert variant="success" title="Validated">
              Query compiled with {params.length} param{params.length === 1 ? '' : 's'}. You can re-draft to change it, or simulate below.
            </Alert>
          )}
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={handleDraft} disabled={drafting}>
              {drafting ? 'Drafting…' : draft ? 'Re-draft' : 'Draft query'}
            </Button>
            {draft && (
              <Button variant="danger" onClick={handleDiscard}>
                Discard
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title="2. Simulate"
        description="Run the drafted query against the real projection store and check the result and the Postgres planner's cost estimate."
      >
        {!canSimulate ? (
          <p className="text-sm text-slate-500">Draft a valid query above first.</p>
        ) : (
          <div className="space-y-4">
            <ParamsForm params={params} values={paramValues} onChange={setParamValues} />
            {simulateError && (
              <Alert variant="error" title={simulateError.code || 'Simulate failed'}>
                {simulateError.message}
              </Alert>
            )}
            <Button variant="primary" onClick={handleSimulate} disabled={simulating}>
              {simulating ? 'Simulating…' : 'Run simulation'}
            </Button>

            {simulateResult && (
              <div className="space-y-3 pt-2">
                <MetricsStrip
                  metrics={simulateResult.metrics}
                  rowCount={simulateResult.rowCount}
                  truncated={simulateResult.truncated}
                />
                <ResultsTable rows={simulateResult.rows} />
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="3. Publish"
        description="Make this query callable by client apps via POST /data-query. You'll choose which realm roles and groups may invoke it when you publish."
      >
        {!canPublish ? (
          <p className="text-sm text-slate-500">Run a successful simulation above before publishing.</p>
        ) : publishResult ? (
          <Alert variant="success" title="Published">
            <span className="font-mono text-xs">{publishResult.queryName}</span> is now live, published by {publishResult.publishedBy} at{' '}
            {new Date(publishResult.publishedAt).toLocaleString()}.
          </Alert>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Choose the realm roles and groups allowed to call this query, then publish.
            </p>
            {publishError && !showPublishModal && (
              <Alert variant="error" title={publishError.code || 'Publish failed'}>
                {publishError.message}
              </Alert>
            )}
            <Button variant="success" onClick={openPublishModal}>
              Publish query…
            </Button>
          </div>
        )}
      </Panel>

      {showPublishModal && (
        <Modal
          title="Publish query"
          description="Select the realm roles and groups allowed to invoke this query."
          onClose={() => !publishing && setShowPublishModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowPublishModal(false)} disabled={publishing}>
                Cancel
              </Button>
              <Button variant="success" onClick={handlePublish} disabled={publishing || selectedRoles.length === 0}>
                {publishing ? 'Publishing…' : `Publish${selectedRoles.length ? ` (${selectedRoles.length})` : ''}`}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {publishError && (
              <Alert variant="error" title={publishError.code || 'Publish failed'}>
                {publishError.message}
              </Alert>
            )}
            <RolePicker value={selectedRoles} onChange={setSelectedRoles} />
            {selectedRoles.length === 0 && (
              <p className="text-xs text-slate-500">Select at least one role or group to enable publishing.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function Stepper({ activeStep }) {
  const steps = [
    { n: STEP.DRAFT, label: 'Draft' },
    { n: STEP.SIMULATE, label: 'Simulate' },
    { n: STEP.PUBLISH, label: 'Publish' },
  ]
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => (
        <li key={s.n} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={[
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                activeStep >= s.n ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500',
              ].join(' ')}
            >
              {s.n}
            </span>
            <span className={activeStep >= s.n ? 'text-sm font-medium text-slate-900' : 'text-sm text-slate-500'}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && <span className="h-px w-10 bg-slate-200" />}
        </li>
      ))}
    </ol>
  )
}
