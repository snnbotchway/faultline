import { useSyncExternalStore } from 'react'
import { explain } from '@/api/errors'

// An action the message offers, such as undoing what was just done.
export type NoticeAction = { label: string; run: () => void }

// One short message at a time, for an action whose result the screen cannot show by itself (usually a failure).
let current: { id: number; text: string; error: boolean; action?: NoticeAction } | undefined
const listeners = new Set<() => void>()
export const SHOWN_FOR = 6000
let timer: ReturnType<typeof setTimeout> | undefined

// While the pointer or focus is on the message it stays, so its action can still be reached. Letting go of both
// starts its time again.
export const NoticeHold = { pointer: 'pointer', focus: 'focus' } as const
export type NoticeHold = (typeof NoticeHold)[keyof typeof NoticeHold]
const held: Record<NoticeHold, boolean> = { pointer: false, focus: false }
const holding = () => held.pointer || held.focus

const emit = () => listeners.forEach((listener) => listener())

function show(next: typeof current) {
  clearTimeout(timer)
  held.pointer = held.focus = false
  current = next
  timer = next && setTimeout(() => show(undefined), SHOWN_FOR)
  emit()
}

export function holdNotice(by: NoticeHold, on: boolean) {
  const was = holding()
  held[by] = on
  if (holding()) clearTimeout(timer)
  else if (was && current) timer = setTimeout(() => show(undefined), SHOWN_FOR)
}

// For the message's element going away, which leaves no pointer or focus to let go of it.
export function releaseNotice() {
  if (!holding()) return
  holdNotice(NoticeHold.pointer, false)
  holdNotice(NoticeHold.focus, false)
}

export function notify(text: string, error = false, action?: NoticeAction) {
  const id = (current?.id ?? 0) + 1
  // Taking the action is the end of the message.
  show({ id, text, error, action: action && { label: action.label, run: () => {
        if (current?.id === id) show(undefined)
        action.run()
      } } })
}

// Drops the message now: a dialog that opens starts a new task, and an old message would sit over it.
export function clearNotice() {
  if (current) show(undefined)
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
