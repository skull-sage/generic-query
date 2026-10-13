import { useEffect, useState } from 'react'
import { getQueryRoles } from '../api/engineClient.js'

/**
 * Loads the realm roles and groups from GET /query-roles once. Returns { realmRoles, groups,
 * loading, error }. Shared by the publish dialog (which picks the allowed roles) and the run page
 * (which picks a calling identity).
 */
export function useQueryRoles() {
  const [realmRoles, setRealmRoles] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getQueryRoles()
      .then((res) => {
        if (cancelled) return
        setRealmRoles(res?.realmRoles || [])
        setGroups(res?.groups || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { realmRoles, groups, loading, error }
}
