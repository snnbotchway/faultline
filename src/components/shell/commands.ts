import { useEffect, useState, useSyncExternalStore } from 'react'

export type Command = { id: string; group: string; label: string; keys?: string; run: () => void }

// Screens register the commands that apply right now; a command that does not apply is simply absent.
export const registry = new Map<symbol, Command[]>()
let isOpen = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

export const palette = {
  open() {
    isOpen = true
    notify()
  },
  close() {
    isOpen = false
    notify()
  },
  toggle() {
    isOpen = !isOpen
    notify()
  },
}

export function useCommands(commands: Command[]) {
  const [key] = useState(() => Symbol('commands'))
  useEffect(() => {
    registry.set(key, commands)
    return () => void registry.delete(key)
  })
}

export function usePaletteOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => isOpen,
  )
}
