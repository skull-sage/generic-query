/**
 * Shows the simulate response's performance metrics -- latency, rows scanned, and the
 * PostgreSQL planner's estimated plan cost -- as a row of small stat cards.
 */
export default function MetricsStrip({ metrics, rowCount, truncated }) {
  const stats = [
    { label: 'Latency', value: `${metrics.latencyMs} ms` },
    { label: 'Rows scanned', value: metrics.rowsScanned },
    { label: 'Planner cost', value: metrics.planCost, hint: 'PostgreSQL query planner estimate' },
    { label: 'Rows returned', value: `${rowCount}${truncated ? '+' : ''}` },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200" title={s.hint}>
          <p className="text-xs text-slate-500">{s.label}</p>
          <p className="text-sm font-semibold text-slate-900">{s.value}</p>
        </div>
      ))}
    </div>
  )
}
