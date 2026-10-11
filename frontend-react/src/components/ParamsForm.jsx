const PLACEHOLDER = {
  STRING: 'e.g. SHIPPED',
  INT: 'e.g. 12',
  LONG: 'e.g. 12',
  DECIMAL: 'e.g. 128.50',
  BOOLEAN: 'true / false',
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DDTHH:mm:ssZ',
}

/**
 * Renders one labeled input per declared param (from the ValidatedQuery.params list) and
 * reports back a { [paramName]: typedValue } map on every change, coercing numeric/boolean
 * types so the simulate/invoke payload matches what the backend's ParamType check expects.
 */
export default function ParamsForm({ params, values, onChange }) {
  if (!params || params.length === 0) {
    return <p className="text-sm text-slate-500">This query has no params.</p>
  }

  function handleInput(name, type, rawValue) {
    onChange({ ...values, [name]: coerce(type, rawValue) })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {params.map((p) => (
        <label key={p.name} className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">
            {p.name} <span className="text-slate-400">({p.type})</span>
          </span>
          <input
            type="text"
            placeholder={PLACEHOLDER[p.type] || ''}
            value={displayValue(values[p.name])}
            onChange={(e) => handleInput(p.name, p.type, e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
        </label>
      ))}
    </div>
  )
}

function displayValue(value) {
  return value === undefined || value === null ? '' : String(value)
}

function coerce(type, raw) {
  if (raw === '') return undefined
  switch (type) {
    case 'INT':
    case 'LONG': {
      const n = Number.parseInt(raw, 10)
      return Number.isNaN(n) ? raw : n
    }
    case 'DECIMAL': {
      const n = Number.parseFloat(raw)
      return Number.isNaN(n) ? raw : n
    }
    case 'BOOLEAN':
      return raw.trim().toLowerCase() === 'true'
    default:
      return raw
  }
}
