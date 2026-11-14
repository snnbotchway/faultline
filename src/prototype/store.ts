// THROWAWAY PROTOTYPE. Triage state shared by the three variants: filters, cursor,
// selection and stubbed mutations (nothing is sent anywhere). Module-level so it
// survives navigating between the inbox and issue routes.
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useSyncExternalStore } from 'react'
import { ISSUES, ME, type Issue, type Status, type Trend } from './data'

export type SortKey = 'lastSeen' | 'firstSeen' | 'count' | 'users'
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'lastSeen', label: 'Last seen' },
  { key: 'firstSeen', label: 'First seen' },
  { key: 'count', label: 'Events' },
  { key: 'users', label: 'Users' },
]

type State = {
  status: Record<string, Status>
  assignee: Record<string, string | undefined>
  query: string
  project: string | null
  env: string | null
  sort: SortKey
  cursor: string
  selected: string[]
  palette: boolean
  eventIndex: number
  /** Variant C lists issues in new / spiking / ongoing groups; j/k must follow that order. */
  grouped: boolean
}

let state: State = {
  status: {},
  assignee: {},
  query: 'is:unresolved',
  project: null,
  env: null,
  sort: 'lastSeen',
  cursor: '',
  selected: [],
  palette: false,
  eventIndex: 0,
  grouped: false,
}
const listeners = new Set<() => void>()

export function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
export const get = () => state
export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    get,
  )
}

const GROUP_ORDER: Record<Trend, number> = { new: 0, spiking: 1, ongoing: 2 }

export const statusOf = (s: State, id: string): Status => s.status[id] ?? 'unresolved'

/** GlitchTip-style search: `is:` / `level:` / `project:` tokens, the rest is free text. */
export function visible(s: State): Issue[] {
  const tokens = s.query.trim().split(/\s+/).filter(Boolean)
  const text: string[] = []
  let is: string | null = null
  let level: string | null = null
  let project = s.project
  for (const t of tokens) {
    const [k, v] = t.split(':')
    if (v !== undefined && k === 'is') is = v
    else if (v !== undefined && k === 'level') level = v
    else if (v !== undefined && k === 'project') project = v
    else text.push(t.toLowerCase())
  }
  return ISSUES.filter(
    (i) =>
      (!is || statusOf(s, i.id) === is) &&
      (!level || i.level === level) &&
      (!project || i.project === project) &&
      text.every((t) => `${i.type} ${i.value} ${i.shortId} ${i.filename} ${i.fn}`.toLowerCase().includes(t)),
  ).sort((a, b) => (s.grouped ? GROUP_ORDER[a.trend] - GROUP_ORDER[b.trend] : 0) || b[s.sort] - a[s.sort])
}

export function statusCounts(s: State): Record<Status, number> {
  const out = { unresolved: 0, resolved: 0, ignored: 0 }
  for (const i of ISSUES) if (!s.project || i.project === s.project) out[statusOf(s, i.id)]++
  return out
}

export function currentStatus(s: State): Status | null {
  const m = /(?:^|\s)is:(\w+)/.exec(s.query)
  return (m?.[1] as Status | undefined) ?? null
}

export function setStatusFilter(status: Status) {
  const rest = state.query.replace(/(?:^|\s)is:\w+/g, '').trim()
  set({ query: `is:${status}${rest ? ` ${rest}` : ''}`, selected: [] })
  fixCursor()
}

export function fixCursor() {
  const list = visible(state)
  if (!list.some((i) => i.id === state.cursor)) set({ cursor: list[0]?.id ?? '' })
}

/** The issues an action applies to: the selection, or the row under the cursor. */
export function targets(s: State = state): string[] {
  return s.selected.length > 0 ? s.selected : s.cursor ? [s.cursor] : []
}

export type Action = 'resolve' | 'ignore' | 'reopen' | 'assign'
export function act(action: Action, ids: string[] = targets()) {
  if (ids.length === 0) return
  const before = visible(state)
  const at = before.findIndex((i) => i.id === state.cursor)
  if (action === 'assign') {
    const assignee = { ...state.assignee }
    const all = ids.every((id) => assignee[id] === ME)
    for (const id of ids) assignee[id] = all ? undefined : ME
    set({ assignee })
    return
  }
  const status = { ...state.status }
  const to: Status = action === 'resolve' ? 'resolved' : action === 'ignore' ? 'ignored' : 'unresolved'
  for (const id of ids) status[id] = status[id] === to ? 'unresolved' : to
  set({ status, selected: [] })
  const after = visible(state)
  if (!after.some((i) => i.id === state.cursor)) {
    set({ cursor: after[Math.min(Math.max(at, 0), after.length - 1)]?.id ?? '' })
  }
}

export function move(delta: number) {
  const list = visible(state)
  if (list.length === 0) return
  const at = list.findIndex((i) => i.id === state.cursor)
  const next = list[Math.min(list.length - 1, Math.max(0, at + delta))]
  if (next) set({ cursor: next.id, eventIndex: 0 })
  void document.querySelector(`[data-row="${next?.id}"]`)?.scrollIntoView({ block: 'nearest' })
}

export function toggleSelect(id: string = state.cursor) {
  if (!id) return
  set({ selected: state.selected.includes(id) ? state.selected.filter((x) => x !== id) : [...state.selected, id] })
}

export function toggleAll() {
  const ids = visible(state).map((i) => i.id)
  set({ selected: state.selected.length === ids.length ? [] : ids })
}

// --- routing -----------------------------------------------------------------

export type Variant = 'a' | 'b' | 'c'
export const VARIANTS: { key: Variant; name: string }[] = [
  { key: 'a', name: 'Ledger' },
  { key: 'b', name: 'Triage' },
  { key: 'c', name: 'Seismograph' },
]
export type ProtoSearch = { variant?: Variant; theme?: 'dark' | 'light'; id?: string; bar?: number }

export function validateSearch(s: Record<string, unknown>): ProtoSearch {
  return {
    variant: s.variant === 'b' || s.variant === 'c' ? s.variant : s.variant === 'a' ? 'a' : undefined,
    theme: s.theme === 'dark' ? 'dark' : s.theme === 'light' ? 'light' : undefined,
    id: s.id === undefined ? undefined : String(s.id),
    bar: s.bar === 0 ? 0 : undefined,
  }
}

export function useProto() {
  const search = useSearch({ strict: false }) as ProtoSearch
  const navigate = useNavigate()
  const variant = search.variant ?? 'a'
  const dark = search.theme === 'dark'
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  return {
    variant,
    dark,
    search,
    id: search.id,
    openIssue: (id: string) => {
      set({ cursor: id, eventIndex: 0 })
      void navigate({ to: '/prototype/issue', search: { ...search, id } })
    },
    toInbox: () => void navigate({ to: '/prototype/inbox', search: { ...search, id: undefined } }),
    setSearch: (patch: ProtoSearch) =>
      void navigate({ to: '.', search: { ...search, ...patch }, replace: true }),
  }
}
export type Proto = ReturnType<typeof useProto>

// --- keyboard ----------------------------------------------------------------

function typing(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/**
 * j/k move, x select, e or r resolve, i ignore, a assign to me, / search,
 * Enter open, Esc back, Cmd/Ctrl+K palette, [ and ] older/newer event.
 */
export function useKeys(opts: { onEnter?: () => void; onEscape?: () => void; events?: number }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        set({ palette: !state.palette })
        return
      }
      if (state.palette) return
      if (typing(e)) {
        if (e.key === 'Escape' || e.key === 'Enter') (e.target as HTMLElement).blur()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const max = (opts.events ?? 1) - 1
      switch (e.key) {
        case 'j':
          return move(1)
        case 'k':
          return move(-1)
        case 'x':
          return toggleSelect()
        case 'e':
        case 'r':
          return act('resolve')
        case 'i':
          return act('ignore')
        case 'a':
          return act('assign')
        case '[':
          return set({ eventIndex: Math.min(max, state.eventIndex + 1) })
        case ']':
          return set({ eventIndex: Math.max(0, state.eventIndex - 1) })
        case '/':
          e.preventDefault()
          return document.querySelector<HTMLInputElement>('[data-search]')?.focus()
        case 'Enter':
          return opts.onEnter?.()
        case 'Escape':
          if (state.selected.length > 0) return set({ selected: [] })
          return opts.onEscape?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(fixCursor, [])
}
