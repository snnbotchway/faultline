import { useCallback, useMemo, useState } from 'react'
import type { IssueFilters } from '@/api/issues'
import { hitsText, type Hits } from '@/lib/format'
import { messages, useT, type Messages } from '@/i18n'
import type { Target } from './actions'
import type { Row } from './inbox-row'
import { statusActions, type StatusView } from './status'

type Stored = { scope: string; ids: ReadonlySet<string>; all: boolean; anchor?: string }

const NONE: ReadonlySet<string> = new Set()

// The ids from one row to another, both included, whichever comes first. Empty when either is not in the list.
export function idsBetween(order: readonly string[], from: string, to: string) {
  const start = order.indexOf(from)
  const end = order.indexOf(to)
  if (start === -1 || end === -1) return []
  return order.slice(Math.min(start, end), Math.max(start, end) + 1)
}

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

  // Both take the state the box will show, not a flip of what is stored: under "select all matching" the
  // ids set is not what the boxes show.
  const toggle = useCallback(
    (id: string, checked: boolean) =>
      setStored((previous) => {
        const next = new Set(previous.scope === scope ? previous.ids : NONE)
        if (checked) next.add(id)
        else next.delete(id)
        return { scope, ids: next, all: false, anchor: id }
      }),
    [scope],
  )
  // Shift-click, or shift+x: gives every row from the last one ticked or unticked to this one the state this
  // row's box takes, so a range unticks as well as ticks.
  const extendTo = useCallback(
    (id: string, order: readonly string[], checked: boolean) =>
      setStored((previous) => {
        const ids = previous.scope === scope ? previous.ids : NONE
        const range = previous.scope === scope && previous.anchor ? idsBetween(order, previous.anchor, id) : []
        if (range.length === 0) {
          const next = new Set(ids)
          if (checked) next.add(id)
          else next.delete(id)
          return { scope, ids: next, all: false, anchor: id }
        }
        const next = new Set(ids)
        for (const rangeId of range) {
          if (checked) next.add(rangeId)
          else next.delete(rangeId)
        }
        return { scope, ids: next, all: false, anchor: id }
      }),
    [scope],
  )
  const set = useCallback((next: string[]) => setStored({ scope, ids: new Set(next), all: false }), [scope])
  const clear = useCallback(() => setStored({ scope, ids: NONE, all: false }), [scope])
  // Every issue the filters match, loaded or not. It holds until a row is unticked or the selection is cleared,
  // so rows that load later are part of it.
  const selectAllMatching = useCallback(() => setStored((previous) => (previous.scope === scope ? { ...previous, all: true } : previous)), [scope])

  return useMemo(() => ({ ids, all, toggle, extendTo, set, clear, selectAllMatching }), [ids, all, toggle, extendTo, set, clear, selectAllMatching])
}

export type Selection = ReturnType<typeof useSelection>

type OfferInput = {
  rows: Row[]
  selection: Pick<Selection, 'ids' | 'all'>
  view: StatusView
  filters: IssueFilters
  hits: Hits | undefined
  hasMore: boolean
  // The words `what` is written in; the language on screen unless given.
  words?: Messages['issues']
}

/**
 * What the selection is and what can be done with it. Keys, palette commands and both
 * toolbars read this, so an action is offered in all of them or in none.
 */
export function selectionOffer({ rows, selection, view, filters, hits, hasMore, words = messages().issues }: OfferInput) {
  const selected = selection.all ? rows : rows.filter((row) => selection.ids.has(row.issue.id))
  const ids = selected.map((row) => row.issue.id)
  const selecting = ids.length > 0
  const allMatching = selecting && selection.all
  const everyLoaded = selecting && ids.length === rows.length
  const target: Target = allMatching ? { selection: { filters }, ids } : { selection: { ids }, ids }
  // The backend stops counting at a limit, so "all matching" may be a count like `1000+`, which has no plural of its own.
  const total: Hits = allMatching && hits ? hits : { n: ids.length, capped: false }
  const count = hitsText(total)
  return {
    ids,
    selecting,
    everyLoaded,
    allMatching,
    canSelectAllMatching: everyLoaded && hasMore && !allMatching,
    target,
    count,
    what: words.issueCount(total.capped ? count : total.n),
    statuses: statusActions(view),
    // The backend only takes a status change or a delete for "every match"; assigning and merging need the issues named.
    canAssign: !allMatching,
    canMerge: !allMatching && ids.length >= 2 && new Set(selected.map((row) => row.issue.project.id)).size === 1,
    // The backend keeps the newest issue of a merge.
    survivor: selected.reduce<Row | undefined>((newest, row) => (!newest || Number(row.issue.id) > Number(newest.issue.id) ? row : newest), undefined),
  }
}

export function useSelectionOffer({ rows, selection, view, filters, hits, hasMore }: Omit<OfferInput, 'words'>) {
  const words = useT().issues
  return useMemo(() => selectionOffer({ rows, selection, view, filters, hits, hasMore, words }), [rows, selection, view, filters, hits, hasMore, words])
}

export type SelectionOffer = ReturnType<typeof selectionOffer>
