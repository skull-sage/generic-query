import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const SIZES = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

// Several modals can be open at once (a confirm on top of a wizard); only the last one opened
// reacts to Escape and Tab, and the page stays scroll-locked until the last one closes.
const openStack = []

/**
 * Accessible dialog rendered into document.body.
 * - Escape and the close button call onRequestClose; the caller decides whether to close
 *   (e.g. to confirm discarding unsaved edits).
 * - Focus moves into the dialog on open, is kept inside it while open (Tab/Shift+Tab), and
 *   returns to the previously focused element on close.
 * - Backdrop clicks close only when closeOnBackdrop is set, so long multi-step forms aren't
 *   dismissed by a stray click.
 */
export default function Modal({
  title,
  description,
  headerExtra,
  size = 'md',
  onRequestClose,
  closeOnBackdrop = false,
  footer,
  footerStart,
  children,
}) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onRequestClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onRequestClose
  }, [onRequestClose])

  useEffect(() => {
    const token = {}
    openStack.push(token)
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const firstField = panel?.querySelector('[data-autofocus]') || panel
    firstField?.focus({ preventScroll: true })

    function onKeyDown(e) {
      if (openStack[openStack.length - 1] !== token) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key === 'Tab' && panel) {
        const focusable = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openStack.splice(openStack.indexOf(token), 1)
      if (openStack.length === 0) document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/50 motion-safe:animate-fade-in"
        aria-hidden="true"
        onClick={closeOnBackdrop ? () => onCloseRef.current?.() : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[92vh] w-full ${SIZES[size]} flex-col rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 outline-none motion-safe:animate-pop-in`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="truncate text-base font-semibold text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {headerExtra}
            <button
              type="button"
              onClick={() => onCloseRef.current?.()}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
              aria-label="Close dialog"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {(footer || footerStart) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
            <div className="flex items-center gap-2">{footerStart}</div>
            <div className="flex flex-wrap items-center justify-end gap-2">{footer}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
