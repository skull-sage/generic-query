const STYLES = {
  DRAFT: 'bg-amber-100 text-amber-800',
  VALIDATED: 'bg-blue-100 text-blue-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  DISCARDED: 'bg-slate-100 text-slate-600',
}

/** Small colored pill for a draft/published status string (DRAFT, VALIDATED, PUBLISHED, ...). */
export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  )
}
