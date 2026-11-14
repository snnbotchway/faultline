import { useCallback, useMemo, useState } from 'react'

type Stored = { scope: string; ids: ReadonlySet<string>; all: boolean }

const NONE: ReadonlySet<string> = new Set()

/**
 * The inbox selection. It belongs to the filters it was made under (`scope`): once they
 * change, the old selection reads as empty, so "all matching" can never be carried over
 * to a different set of issues, whoever changed the filters.
 */
export function useSelection(scope: string) {
  const [stored, setStored] = useState<Stored>({ scope, ids: NONE, all: false })
  const live = stored.scope === scope
  const ids = live ? stored.ids : NONE
  const all = live && stored.all

  const toggle = useCallback(
    (id: string) =>
      setStored((previous) => {
        const next = new Set(previous.scope === scope ? previous.ids : NONE)
        if (!next.delete(id)) next.add(id)
        return { scope, ids: next, all: false }
      }),
    [scope],
  )
  const set = useCallback((next: string[]) => setStored({ scope, ids: new Set(next), all: false }), [scope])
  const clear = useCallback(() => setStored({ scope, ids: NONE, all: false }), [scope])
  // Every issue the filters match, loaded or not. Only meaningful while every loaded row is selected.
  const selectAllMatching = useCallback(() => setStored((previous) => (previous.scope === scope ? { ...previous, all: true } : previous)), [scope])

  return useMemo(() => ({ ids, all, toggle, set, clear, selectAllMatching }), [ids, all, toggle, set, clear, selectAllMatching])
}
