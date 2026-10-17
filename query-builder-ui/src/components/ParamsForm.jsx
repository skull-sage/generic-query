import { useId } from 'react'

const PLACEHOLDER = {
  STRING: 'e.g. SHIPPED',
  INT: 'e.g. 12',
  LONG: 'e.g. 12',
  DECIMAL: 'e.g. 128.50',
  DATETIME: 'e.g. 2026-10-01T00:00:00Z',
}

const INPUT_CLASSES =
  'block w-full rounded-md border-0 py-1.5 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:bg-slate-50 disabled:text-slate-500'

/**
 * One labeled input per declared param ([{ name, type }] from the validated query). Reports a
 * { [name]: typedValue } map on every change, coercing numbers and booleans so the payload
 * matches the engine's type check; an empty field is left out (the engine then reports it as
 * missing). Values that don't parse are sent as typed text so the engine can name the problem.
 */
export default function ParamsForm({ params, values, onChange, disabled = false }) {
  const baseId = useId()

  if (!params || params.length === 0) {
    return <p className="text-sm text-slate-500">This query takes no params.</p>
  }

  function update(name, type, raw) {
    const next = { ...values }
    const coerced = coerce(type, raw)
    if (coerced === undefined) delete next[name]
    else next[name] = coerced
    onChange(next)
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {params.map((p) => {
        const id = `${baseId}-${p.name}`
        const value = values[p.name]
        return (
          <div key={p.name}>
            <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-700">
              <span className="font-mono">{p.name}</span> <span className="text-slate-400">({p.type})</span>
            </label>
            {p.type === 'BOOLEAN' ? (
              <select
                id={id}
                value={value === undefined ? '' : String(value)}
                onChange={(e) => update(p.name, p.type, e.target.value)}
                disabled={disabled}
                className={INPUT_CLASSES}
              >
                <option value="">Select…</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                id={id}
                type={p.type === 'DATE' ? 'date' : 'text'}
                inputMode={['INT', 'LONG', 'DECIMAL'].includes(p.type) ? 'decimal' : undefined}
                placeholder={PLACEHOLDER[p.type] || ''}
                value={value === undefined || value === null ? '' : String(value)}
                onChange={(e) => update(p.name, p.type, e.target.value)}
                disabled={disabled}
                autoComplete="off"
                className={INPUT_CLASSES}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Keeps only the values that belong to the current param list (after the params changed). */
export function pickParamValues(params, values) {
  const names = new Set((params || []).map((p) => p.name))
  return Object.fromEntries(Object.entries(values || {}).filter(([name]) => names.has(name)))
}

function coerce(type, raw) {
  if (raw === '' || raw === undefined) return undefined
  switch (type) {
    case 'INT':
    case 'LONG':
      return /^-?\d+$/.test(raw.trim()) ? Number.parseInt(raw, 10) : raw
    case 'DECIMAL':
      return raw.trim() !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : raw
    case 'BOOLEAN':
      return raw === 'true'
    default:
      return raw
  }
}
