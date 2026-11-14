import { useState } from 'react'

/**
 * One row open at a time. Until the user opens or closes one, the open row is `initial`, which may change as
 * data arrives; `null` is the user having closed them all.
 */
export function useFold(initial?: string) {
  const [chosen, setChosen] = useState<string | null>()
  const open = chosen === undefined ? initial : chosen
  return { is: (id: string) => open === id, toggle: (id: string) => setChosen(open === id ? null : id), close: () => setChosen(null) }
}
