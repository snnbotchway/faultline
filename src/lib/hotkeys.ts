import { useEffect, useRef } from 'react'

type Handler = (event: KeyboardEvent) => void

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

const overlayOpen = () => document.querySelector('[role="dialog"], [role="menu"]') !== null

/**
 * Page-level shortcuts. Keys are `event.key` values; prefix with `mod+` for Cmd/Ctrl.
 * Plain keys are ignored while the user types or a menu or dialog is open.
 */
export function useHotkeys(keys: Record<string, Handler>) {
  const latest = useRef(keys)
  useEffect(() => {
    latest.current = keys
  })
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey
      if (mod) {
        const handler = latest.current[`mod+${event.key.toLowerCase()}`]
        if (handler) {
          event.preventDefault()
          handler(event)
        }
        return
      }
      if (event.altKey || overlayOpen()) return
      if (isTyping(event.target)) {
        if (event.key === 'Escape') (event.target as HTMLElement).blur()
        return
      }
      latest.current[event.key]?.(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
