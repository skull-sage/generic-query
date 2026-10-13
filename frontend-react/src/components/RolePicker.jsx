import Alert from './Alert.jsx'
import { useQueryRoles } from '../hooks/useQueryRoles.js'

/**
 * Multi-select list of realm roles and groups, grouped under two headings. Controlled via
 * `value` (array of selected names) and `onChange(nextNames)`. Used in the publish dialog to pick
 * a query's allowed roles. Realm roles and groups share one flat name space -- the backend's RBAC
 * gate compares the caller's roles/groups against these names directly.
 */
export default function RolePicker({ value = [], onChange }) {
  const { realmRoles, groups, loading, error } = useQueryRoles()

  function toggle(name) {
    if (value.includes(name)) {
      onChange(value.filter((n) => n !== name))
    } else {
      onChange([...value, name])
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading roles…</p>
  if (error) return <Alert variant="error" title="Could not load roles">{error}</Alert>

  return (
    <div className="space-y-4">
      <RoleGroup title="Realm roles">
        {realmRoles.map((r) => (
          <RoleRow
            key={r.name}
            name={r.name}
            description={r.description}
            checked={value.includes(r.name)}
            onToggle={() => toggle(r.name)}
          />
        ))}
      </RoleGroup>
      <RoleGroup title="Groups">
        {groups.map((g) => (
          <RoleRow
            key={g.name}
            name={g.name}
            description={g.path}
            checked={value.includes(g.name)}
            onToggle={() => toggle(g.name)}
          />
        ))}
      </RoleGroup>
    </div>
  )
}

function RoleGroup({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function RoleRow({ name, description, checked, onToggle }) {
  return (
    <label className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 font-mono">{name}</span>
        {description && <span className="block text-xs text-slate-500 truncate">{description}</span>}
      </span>
    </label>
  )
}
