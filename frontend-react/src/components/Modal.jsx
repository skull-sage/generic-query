import { useEffect } from 'react'

/** A centered modal dialog with a backdrop. Closes on Escape or backdrop click. */
export default function Modal({ title, description, onClose, children, footer }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
