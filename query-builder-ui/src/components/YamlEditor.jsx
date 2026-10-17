import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { githubLight } from '@uiw/codemirror-theme-github'

const EXTENSIONS = [yaml()]

/** Syntax-highlighted YAML editor for a query entry (queryName, sql, params). */
export default function YamlEditor({ value, onChange, readOnly = false, height = '300px', label = 'Query definition (YAML)' }) {
  return (
    <div className={`overflow-hidden rounded-md ring-1 ${readOnly ? 'ring-slate-200 opacity-80' : 'ring-slate-300 focus-within:ring-2 focus-within:ring-indigo-600'}`}>
      <CodeMirror
        value={value}
        height={height}
        extensions={EXTENSIONS}
        theme={githubLight}
        editable={!readOnly}
        readOnly={readOnly}
        onChange={onChange}
        aria-label={label}
        basicSetup={{ lineNumbers: true, foldGutter: true, tabSize: 2 }}
      />
    </div>
  )
}
