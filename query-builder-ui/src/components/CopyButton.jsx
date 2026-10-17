import { useEffect, useState } from 'react'
import Button from './Button.jsx'

/** Copies `text` to the clipboard and briefly confirms. */
export default function CopyButton({ text, label = 'Copy' }) {
  const [state, setState] = useState('idle')

  useEffect(() => {
    if (state === 'idle') return undefined
    const t = setTimeout(() => setState('idle'), 1500)
    return () => clearTimeout(t)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={copy} aria-live="polite">
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
    </Button>
  )
}
