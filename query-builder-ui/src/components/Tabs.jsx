/**
 * Horizontal tab bar for filtering a single list (not separate panels), so it uses
 * aria-pressed toggle buttons. tabs: [{ key, label, count }].
 */
export default function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.key)}
            className={[
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
              active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            ].join(' ')}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
