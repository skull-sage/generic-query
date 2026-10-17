import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const LeaveGuardContext = createContext(null)

/**
 * Lets components with unsaved work (the query wizard) block app-level navigation such as
 * switching domains. Components register with useLeaveGuard(active, message); navigators call
 * requestLeave(proceed), which runs proceed right away when nothing is blocking, and otherwise
 * asks the user first. Closing or reloading the tab gets the browser's own prompt.
 */
export function LeaveGuardProvider({ children }) {
  const blockers = useRef(new Map())
  const [pending, setPending] = useState(null) // { message, proceed }

  const register = useCallback((id, message) => {
    blockers.current.set(id, message)
    return () => blockers.current.delete(id)
  }, [])

  const requestLeave = useCallback((proceed) => {
    const messages = [...blockers.current.values()]
    if (messages.length === 0) {
      proceed()
      return
    }
    setPending({ message: messages[messages.length - 1], proceed })
  }, [])

  const value = useMemo(() => ({ register, requestLeave }), [register, requestLeave])

  return (
    <LeaveGuardContext.Provider value={value}>
      {children}
      {pending && (
        <ConfirmDialog
          title="Leave without saving?"
          confirmLabel="Leave"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const { proceed } = pending
            setPending(null)
            proceed()
          }}
        >
          {pending.message}
        </ConfirmDialog>
      )}
    </LeaveGuardContext.Provider>
  )
}

export function useLeaveGuard(active, message) {
  const ctx = useContext(LeaveGuardContext)
  useEffect(() => {
    if (!active || !ctx) return undefined
    const unregister = ctx.register(Symbol('leave-guard'), message)
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      unregister()
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [active, message, ctx])
}

export function useRequestLeave() {
  const ctx = useContext(LeaveGuardContext)
  return ctx ? ctx.requestLeave : (proceed) => proceed()
}
