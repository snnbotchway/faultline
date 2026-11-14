import { useSyncExternalStore } from 'react'
import { explain } from '@/api/errors'

// One short message at a time, for an action whose result the screen cannot show by itself (usually a failure).
let current: { id: number; text: string; error: boolean } | undefined
const listeners = new Set<() => void>()
const SHOWN_FOR = 6000

export function notify(text: string, error = false) {
  const id = (current?.id ?? 0) + 1
  current = { id, text, error }
  listeners.forEach((listener) => listener())
  setTimeout(() => {
    if (current?.id !== id) return
    current = undefined
    listeners.forEach((listener) => listener())
  }, SHOWN_FOR)
}

// `action` completes "Couldn't …": "resolve the issue".
export const failed = (error: unknown, action: string) => notify(explain(error, action), true)

export function useNotice() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
