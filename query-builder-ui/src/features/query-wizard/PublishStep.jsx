import Alert, { ErrorAlert } from '../../components/Alert.jsx'
import CopyButton from '../../components/CopyButton.jsx'
import RolePicker from '../../components/RolePicker.jsx'
import { formatDateTime } from '../../utils/format.js'
import { SqlPreview } from './SimulateStep.jsx'

/**
 * Step 3: pick who may invoke the query (allowed_roles), then publish it. After publishing,
 * shows the endpoint client apps call.
 */
export default function PublishStep({ state, domain, onRolesChange }) {
  const { draft, published, selectedRoles, publishBusy, publishError } = state

  if (published) return <PublishedSummary published={published} domain={domain} params={draft?.validatedQuery?.params || []} />

  return (
    <div className="space-y-5">
      <SqlPreview sql={draft?.validatedQuery?.sql} />

      <section aria-labelledby="publish-roles-heading" className="space-y-3">
        <div>
          <h3 id="publish-roles-heading" className="text-sm font-semibold text-slate-900">
            Who can invoke this query?
          </h3>
          <p className="text-sm text-slate-500">
            Callers whose role or group isn&apos;t selected get <span className="font-mono text-xs">403 FORBIDDEN</span>. Pick at least one.
          </p>
        </div>
        <RolePicker value={selectedRoles} onChange={onRolesChange} disabled={publishBusy} />
      </section>

      <ErrorAlert error={publishError} />

      <p className="text-xs text-slate-500">
        Publishing replaces any version already published as <span className="font-mono">{draft?.queryName}</span> on {domain.label} and closes this
        draft.
      </p>
    </div>
  )
}

function PublishedSummary({ published, domain, params }) {
  const sampleParams = Object.fromEntries(params.map((p) => [p.name, `<${p.type}>`]))
  const request = `POST ${domain.serviceUrl}/data-query
Content-Type: application/json
X-Roles: <one of the allowed roles>

${JSON.stringify({ name: published.queryName, params: sampleParams }, null, 2)}`

  return (
    <div className="space-y-4">
      <Alert variant="success" title="Published">
        <span className="font-mono text-xs">{published.queryName}</span> is live on {domain.label}, published by {published.publishedBy} at{' '}
        {formatDateTime(published.publishedAt)}.
      </Alert>
      <section aria-labelledby="published-endpoint-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 id="published-endpoint-heading" className="text-sm font-semibold text-slate-900">
            How client apps call it
          </h3>
          <CopyButton text={request} label="Copy request" />
        </div>
        <pre className="overflow-x-auto rounded-md bg-slate-900 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100">{request}</pre>
      </section>
    </div>
  )
}
