import Alert from './Alert.jsx'
import Button from './Button.jsx'
import Spinner from './Spinner.jsx'
import { useQueryRoles } from '../hooks/useQueryRoles.js'

/**
 * Multi-select of the domain's realm roles and groups, used to choose a query's allowed_roles at
 * publish time. Controlled: `value` is the array of selected names. Roles and groups share one
 * name space -- the engine matches the caller's X-Roles values against these names.
 */
export default function RolePicker({ value = [], onChange, disabled = false }) {
  const { realmRoles, groups, loading, error, retry } = useQueryRoles()

  function toggle(name) {
    onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name])
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner /> Loading roles and groups…
      </p>
    )
  }
  if (error) {
    return (
      <Alert
        variant="error"
        title="Couldn't load roles and groups"
        actions={<Button size="sm" onClick={retry}>Try again</Button>}
      >
        {error.message}
      </Alert>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <RoleGroup title="Realm roles">
        {realmRoles.map((r) => (
          <RoleRow key={r.name} name={r.name} description={r.description} checked={value.includes(r.name)} onToggle={() => toggle(r.name)} disabled={disabled} />
        ))}
      </RoleGroup>
      <RoleGroup title="Groups">
        {groups.map((g) => (
          <RoleRow key={g.name} name={g.name} description={g.description || g.path} checked={value.includes(g.name)} onToggle={() => toggle(g.name)} disabled={disabled} />
        ))}
      </RoleGroup>
    </div>
  )
}

function RoleGroup({ title, children }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      <div className="space-y-1">{children}</div>
    </fieldset>
  )
}

function RoleRow({ name, description, checked, onToggle, disabled }) {
  return (
    <label className={`flex items-start gap-2 rounded-md px-2 py-1.5 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
      />
      <span className="min-w-0">
        <span className="block font-mono text-sm font-medium text-slate-900">{name}</span>
        {description && <span className="block truncate text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  )
}
