import { useSyncExternalStore } from 'react'
import { explain } from '@/api/errors'

// An action the message offers, such as undoing what was just done.
export type NoticeAction = { label: string; run: () => void }

// One short message at a time, for an action whose result the screen cannot show by itself (usually a failure).
let current: { id: number; text: string; error: boolean; action?: NoticeAction } | undefined
const listeners = new Set<() => void>()
const SHOWN_FOR = 6000
// While the pointer or focus is on the message it stays, so its action can still be reached; it goes once let go.
let held = false

export function holdNotice(hold: boolean) {
  held = hold
}

export function notify(text: string, error = false, action?: NoticeAction) {
  const id = (current?.id ?? 0) + 1
  const hide = () => {
    if (current?.id !== id) return
    if (held) return void setTimeout(hide, SHOWN_FOR)
    current = undefined
    listeners.forEach((listener) => listener())
  }
  // Taking the action is the end of the message.
  current = { id, text, error, action: action && { label: action.label, run: () => {
        held = false
        hide()
        action.run()
      } } }
  listeners.forEach((listener) => listener())
  setTimeout(hide, SHOWN_FOR)
}

// Drops the message now: a dialog that opens starts a new task, and an old message would sit over it.
export function clearNotice() {
  if (!current) return
  held = false
  current = undefined
  listeners.forEach((listener) => listener())
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
