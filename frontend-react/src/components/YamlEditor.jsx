import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { githubLight } from '@uiw/codemirror-theme-github'

/** Syntax-highlighted YAML editor for drafting a query entry (queryName, sql, params, ...). */
export default function YamlEditor({ value, onChange, readOnly = false }) {
  return (
    <div className="rounded-md ring-1 ring-slate-300 overflow-hidden">
      <CodeMirror
        value={value}
        height="320px"
        extensions={[yaml()]}
        theme={githubLight}
        editable={!readOnly}
        onChange={onChange}
        basicSetup={{ lineNumbers: true, foldGutter: true, tabSize: 2 }}
      />
    </div>
  )
}
