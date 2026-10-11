import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import QueryBuilderPage from './pages/QueryBuilderPage.jsx'
import QueryListPage from './pages/QueryListPage.jsx'
import QueryRunPage from './pages/QueryRunPage.jsx'

const navLinkClasses = ({ isActive }) =>
  [
    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  ].join(' ')

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-base font-semibold text-slate-900">Query Engine</span>
              <nav className="flex items-center gap-1">
                <NavLink to="/builder" className={navLinkClasses}>
                  Query Builder
                </NavLink>
                <NavLink to="/queries" className={navLinkClasses}>
                  Query List
                </NavLink>
                <NavLink to="/run" className={navLinkClasses}>
                  Run Query
                </NavLink>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/builder" replace />} />
          <Route path="/builder" element={<QueryBuilderPage />} />
          <Route path="/builder/:queryName" element={<QueryBuilderPage />} />
          <Route path="/queries" element={<QueryListPage />} />
          <Route path="/run" element={<QueryRunPage />} />
          <Route path="/run/:queryName" element={<QueryRunPage />} />
        </Routes>
      </main>
    </div>
  )
}
