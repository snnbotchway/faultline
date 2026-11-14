import { useState } from 'react'

/**
 * One row open at a time. Until the user opens or closes one, the open row is the first `initial` given, which may
 * arrive with data that loads late and then stays, so a row added later does not close it. `null` is the user having
 * closed them all.
 */
export function useFold(initial?: string) {
  const [chosen, setChosen] = useState<string | null>()
  const [first, setFirst] = useState(initial)
  if (first === undefined && initial !== undefined) setFirst(initial)
  const open = chosen === undefined ? first : chosen
  return { is: (id: string) => open === id, toggle: (id: string) => setChosen(open === id ? null : id), close: () => setChosen(null) }
}
