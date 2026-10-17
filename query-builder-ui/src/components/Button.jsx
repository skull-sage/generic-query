import Spinner from './Spinner.jsx'

const VARIANTS = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600',
  secondary: 'bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-indigo-600',
  danger: 'bg-white text-rose-700 shadow-sm ring-1 ring-inset ring-rose-300 hover:bg-rose-50 focus-visible:outline-rose-600',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 focus-visible:outline-emerald-600',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-indigo-600',
}

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
}

/**
 * Button with an optional loading state: `loading` shows a spinner, disables the button and
 * keeps its width stable by keeping the label. Defaults to type="button".
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}
