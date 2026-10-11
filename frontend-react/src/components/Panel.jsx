/** A titled card/section used throughout the Query Builder and List pages. */
export default function Panel({ title, description, actions, children, className = '' }) {
  return (
    <section className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
