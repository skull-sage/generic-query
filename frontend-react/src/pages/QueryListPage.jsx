import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Panel from '../components/Panel.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import { listQueries } from '../api/engineClient.js'

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFTED', label: 'Drafted' },
  { key: 'PUBLISHED', label: 'Published' },
]

export default function QueryListPage() {
  const [tab, setTab] = useState('ALL')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listQueries(undefined, { size: 200 })
      .then((res) => {
        if (!cancelled) setItems(res.items || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = items.filter((item) => {
    if (tab === 'ALL') return true
    if (tab === 'DRAFTED') return item.draft !== null
    if (tab === 'PUBLISHED') return item.published !== null
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Query List</h1>
        <p className="text-sm text-slate-500">Every query with an open draft, a published version, or both.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Alert variant="error" title="Could not load queries">{error}</Alert>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-500">No queries in this view.</p>
      ) : (
        <Panel>
          <ul className="divide-y divide-slate-100 -my-4">
            {visible.map((item) => (
              <QueryListRow key={item.queryName} item={item} />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}

function QueryListRow({ item }) {
  const { queryName, published, draft } = item
  return (
    <li className="py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{queryName}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {published && (
            <>
              <StatusBadge status="PUBLISHED" />
              <span className="text-xs text-slate-500">
                published by {published.publishedBy}
              </span>
            </>
          )}
          {draft && (
            <>
              <StatusBadge status={draft.status} />
              <span className="text-xs text-slate-500">
                by {draft.author} {draft.simulated ? '· simulated' : '· not yet simulated'}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {published && (
          <Link to={`/run/${encodeURIComponent(queryName)}`}>
            <Button variant="primary">Run</Button>
          </Link>
        )}
        {draft ? (
          <Link to={`/builder/${encodeURIComponent(queryName)}`}>
            <Button variant="secondary">Edit draft</Button>
          </Link>
        ) : (
          <Link to={`/builder/${encodeURIComponent(queryName)}`}>
            <Button variant="secondary">New draft</Button>
          </Link>
        )}
      </div>
    </li>
  )
}
