import { useCallback, useEffect, useState } from 'react'
import { useDomain } from '../context/DomainContext.jsx'

// One fetch per domain client, shared by every picker that asks (publish step, run dialog).
// A failed fetch isn't cached, so retry() asks the service again.
const cache = new WeakMap()

function loadRoles(client) {
  const cached = cache.get(client)
  if (cached) return cached
  const promise = client
    .getRoles()
    .then((res) => ({ realmRoles: res?.realmRoles || [], groups: res?.groups || [] }))
    .catch((err) => {
      cache.delete(client)
      throw err
    })
  cache.set(client, promise)
  return promise
}

/** The current domain's realm roles and groups from GET /query-roles. */
export function useQueryRoles() {
  const { client } = useDomain()
  const [state, setState] = useState({ status: 'loading', realmRoles: [], groups: [], error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, status: 'loading', error: null }))
    loadRoles(client).then(
      (data) => !cancelled && setState({ status: 'ready', ...data, error: null }),
      (error) => !cancelled && setState({ status: 'error', realmRoles: [], groups: [], error }),
    )
    return () => {
      cancelled = true
    }
  }, [client, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { ...state, loading: state.status === 'loading', retry }
}
