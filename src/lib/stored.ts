import { useState } from 'react'

/**
 * A choice among fixed values that the browser remembers, such as how a stack trace is shown.
 * A stored value that is no longer one of `values` falls back to `initial`.
 */
export function useStoredChoice<T extends string>(key: string, values: readonly T[], initial: T) {
  const [choice, setChoice] = useState<T>(() => {
    const saved = localStorage.getItem(key)
    return values.find((value) => value === saved) ?? initial
  })
  const choose = (next: T) => {
    localStorage.setItem(key, next)
    setChoice(next)
  }
  return [choice, choose] as const
}
