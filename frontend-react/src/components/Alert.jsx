const STYLES = {
  error: 'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  success: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
  info: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200',
}

export default function Alert({ variant = 'info', title, children }) {
  return (
    <div className={`rounded-md px-4 py-3 text-sm ${STYLES[variant]}`}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  )
}
