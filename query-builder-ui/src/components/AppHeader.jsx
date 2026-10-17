import { useMatch, useNavigate } from 'react-router-dom'
import { DOMAINS, findDomain } from '../domains.js'
import { useRequestLeave } from '../context/LeaveGuard.jsx'

/**
 * Full-width app header with the domain switcher. Switching domains navigates to /:domainKey,
 * which remounts the workspace for the new domain; unsaved wizard edits get a confirm first.
 */
export default function AppHeader() {
  const match = useMatch('/:domainKey')
  const current = findDomain(match?.params.domainKey)
  const navigate = useNavigate()
  const requestLeave = useRequestLeave()

  function onChange(e) {
    const key = e.target.value
    if (!key || key === current?.key) return
    requestLeave(() => navigate(`/${key}`))
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white" aria-hidden="true">
            Q
          </span>
          <span className="text-base font-semibold text-slate-900">Query Builder</span>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="domain-select" className="text-sm font-medium text-slate-600">
            Domain
          </label>
          <select
            id="domain-select"
            value={current?.key || ''}
            onChange={onChange}
            className="rounded-md border-0 py-1.5 pl-3 pr-8 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          >
            {!current && (
              <option value="" disabled>
                Select a domain…
              </option>
            )}
            {DOMAINS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          {current && (
            <span className="hidden font-mono text-xs text-slate-500 md:inline" title="The service this workspace talks to">
              {current.service} · {current.serviceUrl}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
