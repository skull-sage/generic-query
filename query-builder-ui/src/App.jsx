import { useEffect } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import AppHeader from './components/AppHeader.jsx'
import { DomainProvider } from './context/DomainContext.jsx'
import { LeaveGuardProvider } from './context/LeaveGuard.jsx'
import { findDomain } from './domains.js'
import { LAST_DOMAIN_STORAGE_KEY } from './config.js'
import DomainSelectPage from './pages/DomainSelectPage.jsx'
import QueryListPage from './pages/QueryListPage.jsx'

export default function App() {
  return (
    <LeaveGuardProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:domainKey" element={<DomainWorkspace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </LeaveGuardProvider>
  )
}

/** First visit asks for a domain; later visits go straight back to the last one used. */
function Home() {
  const last = findDomain(readLastDomain())
  return last ? <Navigate to={`/${last.key}`} replace /> : <DomainSelectPage />
}

/**
 * Everything for one domain. key={domain.key} makes a domain switch unmount the old workspace
 * (cancelling its requests, closing its dialogs) and mount a fresh one for the new domain.
 */
function DomainWorkspace() {
  const { domainKey } = useParams()
  const domain = findDomain(domainKey)

  useEffect(() => {
    if (domain) writeLastDomain(domain.key)
  }, [domain])

  if (!domain) return <Navigate to="/" replace />
  return (
    <DomainProvider key={domain.key} domain={domain}>
      <QueryListPage />
    </DomainProvider>
  )
}

function readLastDomain() {
  try {
    return localStorage.getItem(LAST_DOMAIN_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeLastDomain(key) {
  try {
    localStorage.setItem(LAST_DOMAIN_STORAGE_KEY, key)
  } catch {
    // Private mode or storage disabled: the domain prompt just shows again next time.
  }
}
