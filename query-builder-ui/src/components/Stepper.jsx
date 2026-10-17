/**
 * Step indicator for the query wizard. steps: [{ key, label }]. A step is clickable when
 * reachable[key] is true; completed[key] shows a check mark.
 */
export default function Stepper({ steps, current, reachable = {}, completed = {}, onSelect, disabled = false }) {
  return (
    <nav aria-label="Query steps">
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => {
          const isCurrent = s.key === current
          const isDone = !!completed[s.key]
          const canGo = !disabled && !isCurrent && !!reachable[s.key]
          return (
            <li key={s.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={canGo ? () => onSelect?.(s.key) : undefined}
                disabled={!canGo && !isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600',
                  isCurrent ? 'bg-indigo-50 font-semibold text-indigo-700' : canGo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400',
                  !canGo && !isCurrent ? 'cursor-not-allowed' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isCurrent ? 'bg-indigo-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {isDone && !isCurrent ? '✓' : i + 1}
                </span>
                {s.label}
                {isDone && <span className="sr-only">(done)</span>}
              </button>
              {i < steps.length - 1 && <span className="h-px w-6 bg-slate-200" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
