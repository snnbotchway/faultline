import { useSyncExternalStore } from 'react'

// The width from which a list has room for what a row opens beside it (Tailwind's `lg`).
const DESKTOP = '(min-width: 1024px)'
export const isDesktop = () => window.matchMedia(DESKTOP).matches

// `isDesktop` that re-renders when the window crosses the width.
export function useIsDesktop() {
  return useSyncExternalStore((onChange) => {
    const query = window.matchMedia(DESKTOP)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, isDesktop)
}

// A row's link opens its target beside the list on a desktop, and as a page anywhere else or when the
// user asks for a new tab or window.
export function openBeside(event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; preventDefault: () => void }, open: () => void) {
  if (!isDesktop() || event.metaKey || event.ctrlKey || event.shiftKey) return
  event.preventDefault()
  open()
}
