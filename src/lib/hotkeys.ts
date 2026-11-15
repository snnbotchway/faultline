import { useEffect, useRef } from 'react'

type Handler = (event: KeyboardEvent) => void

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

// Enter and Space already activate the control that has focus; a page shortcut on the same key would act twice.
const ACTIVATION_KEYS = new Set(['Enter', ' '])
function activates(event: KeyboardEvent) {
  return ACTIVATION_KEYS.has(event.key) && event.target instanceof HTMLElement && event.target.closest('button, a, [role="option"], [role="menuitem"]') !== null
}

export const overlayOpen = () => document.querySelector('[role="dialog"], [role="menu"]') !== null

/**
 * Page-level shortcuts. Keys are `event.key` values; prefix with `mod+` for Cmd/Ctrl.
 * Plain keys are ignored while the user types or a menu or dialog is open, and Enter and Space
 * are left to a focused button or link.
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
      // A key something else took, such as the Esc that closed a dialog before this runs, is not a shortcut too.
      if (event.defaultPrevented || event.altKey || overlayOpen() || activates(event)) return
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
