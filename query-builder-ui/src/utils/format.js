const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "3 minutes ago", "in 6 days". Falls back to the raw value when it isn't a date. */
export function formatRelative(value, now = Date.now()) {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return String(value ?? '')
  const seconds = Math.round((time - now) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function formatDateTime(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value ?? '') : d.toLocaleString()
}
