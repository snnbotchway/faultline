import { infiniteQueryOptions, keepPreviousData, queryOptions, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { withBase } from './base'
import { api, orgPath, unwrap } from './client'
import { detailOf } from './errors'
import { MAX_PAGE_SIZE, fetchAllPages, toPage, type Page } from './pagination'
import type { components } from './schema/openapi'
import { DAY_MS, MINUTE_MS } from '@/lib/time'

type Schemas = components['schemas']
// A saved monitor always has an id, though the schema shares its type with the unsaved one.
export type Monitor = Schemas['MonitorSchema'] & { id: number }
export type MonitorDetail = Schemas['MonitorDetailSchema'] & { id: number }
export type Check = Schemas['MonitorCheckResponseTimeSchema']
export type MonitorInput = Schemas['MonitorIn']
export type StatusPage = Schemas['StatusPageSchema']

// The kinds of check the backend knows. Faultline creates all but `SSL`, which only the API makes.
export const MonitorType = { get: 'GET', post: 'POST', ping: 'Ping', port: 'TCP Port', heartbeat: 'Heartbeat', ssl: 'SSL' } as const
export type MonitorType = (typeof MonitorType)[keyof typeof MonitorType]

// Checks that make an HTTP request, and so expect a status and can look for text in the answer.
export const isHttp = (type: string) => type === MonitorType.get || type === MonitorType.post

// Why a check failed, as the backend numbers it.
export const CheckReason = { unknown: 0, timeout: 1, status: 2, body: 3, certificate: 4, network: 5 } as const
export type CheckReason = (typeof CheckReason)[keyof typeof CheckReason]

export const MonitorSort = { status: 'status', newest: '-created', oldest: 'created', name: 'name', project: 'project' } as const
export type MonitorSort = (typeof MonitorSort)[keyof typeof MonitorSort]

// The backend's refusals for a monitor's address.
export const MonitorRefusal = {
  privateAddress: 'URLs targeting private/internal IPs are not allowed',
  badAddress: 'Invalid Url',
  badPort: 'Invalid Port URL, expected hostname and port',
  // The start of the refusal when the organization has as many monitors as its plan allows.
  limit: 'This organization is limited to',
} as const
export type MonitorRefusal = (typeof MonitorRefusal)[keyof typeof MonitorRefusal]

// Which of the known refusals an error from saving a monitor is, if any.
export function monitorRefusal(error: unknown): MonitorRefusal | undefined {
  const detail = detailOf(error)
  if (detail === undefined) return undefined
  return Object.values(MonitorRefusal).find((refusal) => (refusal === MonitorRefusal.limit ? detail.startsWith(refusal) : detail === refusal))
}

const PAGE_SIZE = 50
// Monitors are checked once a minute at the fastest.
const REFRESH_EVERY = MINUTE_MS

export const monitorKeys = {
  all: (slug: string) => ['monitors', slug] as const,
  lists: (slug: string) => [...monitorKeys.all(slug), 'list'] as const,
  list: (slug: string, sort: MonitorSort) => [...monitorKeys.lists(slug), sort] as const,
  detail: (slug: string, id: number) => [...monitorKeys.all(slug), 'detail', id] as const,
  monitor: (slug: string, id: number) => [...monitorKeys.detail(slug, id), 'monitor'] as const,
  changes: (slug: string, id: number) => [...monitorKeys.detail(slug, id), 'changes'] as const,
  checks: (slug: string, id: number, changesOnly: boolean) => [...monitorKeys.detail(slug, id), 'checks', changesOnly] as const,
  statusPages: (slug: string) => [...monitorKeys.all(slug), 'status-pages'] as const,
}

const monitorPath = (slug: string, id: number) => ({ ...orgPath(slug), monitor_id: id })

// Each monitor comes with its newest 60 checks, without response times.
export const monitorListQuery = (slug: string, sort: MonitorSort) =>
  infiniteQueryOptions({
    queryKey: monitorKeys.list(slug, sort),
    initialPageParam: undefined as string | undefined,
    refetchInterval: REFRESH_EVERY,
    queryFn: async ({ pageParam }): Promise<Page<Monitor>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/monitors/', {
        params: { path: orgPath(slug), query: { sort, limit: PAGE_SIZE, cursor: pageParam } },
      })
      return toPage(unwrap(result) as Monitor[], result.response)
    },
    getNextPageParam: (page) => page.cursors.next,
  })

/**
 * One monitor with its newest 60 checks and their response times. A list passes `stamp`, the time
 * of the newest check it has seen, so a row is fetched again only when there is something new.
 */
export const monitorQuery = (slug: string, id: number, stamp?: string) =>
  queryOptions({
    queryKey: [...monitorKeys.monitor(slug, id), stamp ?? 'live'],
    staleTime: stamp === undefined ? 0 : Infinity,
    refetchInterval: stamp === undefined ? REFRESH_EVERY : false,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/', { params: { path: monitorPath(slug, id) } })) as MonitorDetail,
  })

// What the backend has on when a monitor went down or came back: those checks, newest first; whether
// they reach back to its first check; and, while they end where a page ended, the cursor of the next.
export type ChangeHistory = { changes: Check[]; toFirst: boolean; older?: string }

// Each page holds 100 changes; 20 cover a monitor going down every 20 minutes for a fortnight. The
// cap also holds the cache, which grows by joining new pages to it, at that size.
const MAX_CHANGE_PAGES = 20
const MAX_CHANGES = MAX_CHANGE_PAGES * MAX_PAGE_SIZE
// The furthest back any screen draws, the 14-day period. Older changes are dropped from the cache.
const CHANGES_KEPT = 14 * DAY_MS

/** The newest answer in the cache under `key`. */
export function newestData<T>(client: QueryClient, key: QueryKey): T | undefined {
  const queries = client.getQueryCache().findAll({ queryKey: key }).filter((query) => query.state.data !== undefined)
  return queries.sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0]?.state.data as T | undefined
}

/**
 * Pages back through the changes, newest first, until one is older than `since`, the first check is
 * reached or there are as many as are kept. Pages never change once newer changes push them back, so
 * on reaching the newest change in `cached` it takes the rest from there and goes on from its cursor.
 */
async function walkChanges(fetchPage: (cursor?: string) => Promise<Page<Check>>, since: number, cached: ChangeHistory | undefined): Promise<ChangeHistory> {
  const changes: Check[] = []
  const joinAt = cached?.changes[0]?.startCheck
  let joined = joinAt === undefined
  let cursor: string | undefined
  const enough = () => changes.length >= MAX_CHANGES || (changes.length > 0 && Date.parse(changes.at(-1)!.startCheck) < since)
  for (let pages = 0; pages < MAX_CHANGE_PAGES && !enough(); pages++) {
    const page = await fetchPage(cursor)
    const known = joined ? -1 : page.items.findIndex((check) => check.startCheck === joinAt)
    if (known >= 0) {
      joined = true
      changes.push(...page.items.slice(0, known), ...cached!.changes)
      if (cached!.toFirst) return { changes, toFirst: true }
      cursor = cached!.older
      if (cursor === undefined) break
      continue
    }
    changes.push(...page.items)
    cursor = page.cursors.next
    if (cursor === undefined) return { changes, toFirst: true }
  }
  return { changes, toFirst: false, older: cursor }
}

// Keeps the changes back to the first one before `cutoff`, which says what state the monitor was in
// then, and no more than are kept.
function trimChanges(history: ChangeHistory, cutoff: number): ChangeHistory {
  const before = history.changes.findIndex((check) => Date.parse(check.startCheck) < cutoff)
  const keep = Math.min(before === -1 ? history.changes.length : before + 1, MAX_CHANGES)
  return keep === history.changes.length ? history : { changes: history.changes.slice(0, keep), toFirst: false }
}

/**
 * The checks where the monitor went down or came back, newest first, back to one older than the last
 * `window` milliseconds or to the first check. `lastChange` is the monitor's own, so the answer is
 * fetched again only when the monitor has changed state, and then only up to the changes already in
 * the cache, usually one page. A monitor that went down too often to page back that far gets fewer,
 * and `toFirst` false.
 */
export const monitorChangesQuery = (slug: string, id: number, lastChange: string | null, window: number) =>
  queryOptions({
    queryKey: [...monitorKeys.changes(slug, id), lastChange, window],
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    queryFn: async ({ client }): Promise<ChangeHistory> => {
      const now = Date.now()
      const fetchPage = async (cursor?: string) => {
        const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/checks/', {
          params: { path: monitorPath(slug, id), query: { is_change: true, limit: MAX_PAGE_SIZE, cursor } },
        })
        return toPage(unwrap(result), result.response)
      }
      const history = await walkChanges(fetchPage, now - window, newestData<ChangeHistory>(client, monitorKeys.changes(slug, id)))
      return trimChanges(history, now - CHANGES_KEPT)
    },
  })

export const CHECKS_PAGE_SIZE = 25

/**
 * One page of a monitor's checks, newest first, from `cursor` (the newest page without one).
 * `changesOnly` asks for the checks where the monitor went down or came back, the backend's
 * `is_change`; without it every check comes back, changes too. `hits` on a page is the count of
 * checks that match, which the backend stops counting at `maxHits`; it keeps checks for as many days
 * as its retention allows, so there can be many more.
 */
export const monitorChecksQuery = (slug: string, id: number, changesOnly: boolean, cursor?: string) =>
  queryOptions({
    queryKey: [...monitorKeys.checks(slug, id, changesOnly), cursor ?? null],
    // Only the newest page gains checks: a cursor marks a check, and its page holds the ones before it.
    staleTime: cursor === undefined ? 0 : Infinity,
    refetchInterval: cursor === undefined ? REFRESH_EVERY : false,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Page<Check>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/checks/', {
        params: { path: monitorPath(slug, id), query: { is_change: changesOnly ? true : undefined, limit: CHECKS_PAGE_SIZE, cursor } },
      })
      return toPage(unwrap(result), result.response)
    },
  })

export const statusPagesQuery = (slug: string) =>
  queryOptions({
    queryKey: monitorKeys.statusPages(slug),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/status-pages/', {
          params: { path: orgPath(slug), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const monitorActions = {
  create: async (slug: string, body: MonitorInput) =>
    unwrap(await api.POST('/api/0/organizations/{organization_id_or_slug}/monitors/', { params: { path: orgPath(slug) }, body })) as Monitor,
  update: async (slug: string, id: number, body: MonitorInput) =>
    unwrap(await api.PUT('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/', { params: { path: monitorPath(slug, id) }, body })) as Monitor,
  remove: async (slug: string, id: number) =>
    unwrap(await api.DELETE('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/', { params: { path: monitorPath(slug, id) } })),
  // The backend can create a status page but not change or delete one; that is done in its admin.
  createStatusPage: async (slug: string, body: { name: string; isPublic: boolean }) =>
    unwrap(await api.POST('/api/0/organizations/{organization_id_or_slug}/status-pages/', { params: { path: orgPath(slug) }, body })),
}

// Where a status page is shown, and where its monitors and visibility are changed.
export const statusPageUrl = (slug: string, page: string) => withBase(`/status-pages/${slug}/${page}/`)
export const STATUS_PAGE_ADMIN_URL = withBase('/admin/uptime/statuspage/')
