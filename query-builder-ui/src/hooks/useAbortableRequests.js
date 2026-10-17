import { useCallback, useEffect, useRef } from 'react'
import { isAbortError } from '../api/engineClient.js'

/**
 * Tracks the requests a component starts so they're all cancelled when it unmounts (modal
 * closed, domain switched). run(fn) calls fn(signal) and resolves with its result; if the
 * request is cancelled, run's promise never settles, so callers don't need abort checks.
 */
export function useAbortableRequests() {
  const controllers = useRef(new Set())

  useEffect(() => {
    const live = controllers.current
    return () => {
      for (const c of live) c.abort()
      live.clear()
    }
  }, [])

  return useCallback((fn) => {
    const controller = new AbortController()
    controllers.current.add(controller)
    return new Promise((resolve, reject) => {
      fn(controller.signal)
        .then(resolve, (err) => {
          if (!isAbortError(err) && !controller.signal.aborted) reject(err)
        })
        .finally(() => controllers.current.delete(controller))
    })
  }, [])
}
