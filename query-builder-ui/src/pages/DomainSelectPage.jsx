import { Link } from 'react-router-dom'
import { DOMAINS } from '../domains.js'

/** First-run prompt: pick the domain whose query service the builder should work against. */
export default function DomainSelectPage() {
  return (
    <div className="mx-auto max-w-3xl py-10 motion-safe:animate-fade-in">
      <h1 className="text-2xl font-semibold text-slate-900">Choose a domain to start</h1>
      <p className="mt-2 text-sm text-slate-600">
        Each domain has its own query service and database. The queries you draft, simulate and publish belong to the domain you pick, and client apps
        call them on that domain&apos;s service. You can switch domains anytime from the header.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DOMAINS.map((d) => (
          <li key={d.key}>
            <Link
              to={`/${d.key}`}
              className="group block h-full rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <p className="text-base font-semibold text-slate-900 group-hover:text-indigo-700">{d.label}</p>
              <p className="mt-1 text-sm text-slate-600">{d.description}</p>
              <p className="mt-4 font-mono text-xs text-slate-500">
                {d.service} · {d.serviceUrl}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
