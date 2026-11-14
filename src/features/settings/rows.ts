import { useState } from 'react'

// One row open at a time.
export function useFold(initial?: string) {
  const [open, setOpen] = useState(initial)
  return { is: (id: string) => open === id, toggle: (id: string) => setOpen(open === id ? undefined : id), close: () => setOpen(undefined) }
}

// `1 project`, `3 projects`.
export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`
