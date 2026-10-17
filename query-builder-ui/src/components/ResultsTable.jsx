/**
 * Renders simulate/invoke rows as a scrollable table with a sticky header. Columns are the union
 * of keys across rows, in first-seen order.
 */
export default function ResultsTable({ rows, emptyText = 'No rows matched.' }) {
  if (!rows || rows.length === 0) {
    return <p className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">{emptyText}</p>
  }
  const columns = []
  for (const row of rows) {
    for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key)
  }

  return (
    <div className="max-h-80 overflow-auto rounded-md ring-1 ring-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th key={col} scope="col" className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-800">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(value) {
  if (value === null || value === undefined) return <span className="text-slate-400">null</span>
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
