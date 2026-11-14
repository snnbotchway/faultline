import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import { MAX_PAGE_SIZE, fetchAllPages, toPage, type Page } from './pagination'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
export type Monitor = Schemas['MonitorSchema']
export type MonitorDetail = Schemas['MonitorDetailSchema']
export type Check = Schemas['MonitorCheckResponseTimeSchema']
export type MonitorInput = Schemas['MonitorIn']
export type StatusPage = Schemas['StatusPageSchema']

// The kinds of check the form offers. The backend also knows `SSL`, which no screen creates.
export const MonitorType = { get: 'GET', post: 'POST', ping: 'Ping', port: 'TCP Port', heartbeat: 'Heartbeat' } as const
export type MonitorType = (typeof MonitorType)[keyof typeof MonitorType]

// Why a check failed, as the backend numbers it.
export const CheckReason = { unknown: 0, timeout: 1, status: 2, body: 3, certificate: 4, network: 5 } as const
export type CheckReason = (typeof CheckReason)[keyof typeof CheckReason]

export const MonitorSort = { status: 'status', newest: '-created', oldest: 'created', name: 'name', project: 'project' } as const
export type MonitorSort = (typeof MonitorSort)[keyof typeof MonitorSort]

// The backend's refusals for a monitor's address.
export const MonitorRefusal = { privateAddress: 'URLs targeting private/internal IPs are not allowed', badAddress: 'Invalid Url' } as const

const PAGE_SIZE = 50
// Monitors are checked once a minute at the fastest.
const REFRESH_EVERY = 60_000

export const monitorKeys = {
  all: (slug: string) => ['monitors', slug] as const,
  lists: (slug: string) => [...monitorKeys.all(slug), 'list'] as const,
  list: (slug: string, sort: MonitorSort) => [...monitorKeys.lists(slug), sort] as const,
  detail: (slug: string, id: number) => [...monitorKeys.all(slug), 'detail', id] as const,
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
      return toPage(unwrap(result), result.response)
    },
    getNextPageParam: (page) => page.cursors.next,
  })

/**
 * One monitor with its newest 60 checks and their response times. A list passes `stamp`, the time
 * of the newest check it has seen, so a row is fetched again only when there is something new.
 */
export const monitorQuery = (slug: string, id: number, stamp?: string) =>
  queryOptions({
    queryKey: [...monitorKeys.detail(slug, id), 'monitor', stamp ?? 'live'],
    staleTime: stamp === undefined ? 0 : Infinity,
    refetchInterval: stamp === undefined ? REFRESH_EVERY : false,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/', { params: { path: monitorPath(slug, id) } })),
  })

/**
 * The newest checks where the monitor went down or came back, newest first. `lastChange` is the
 * monitor's own, so the answer is fetched again only when the monitor has changed state.
 */
export const monitorChangesQuery = (slug: string, id: number, lastChange: string | null) =>
  queryOptions({
    queryKey: [...monitorKeys.changes(slug, id), lastChange],
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/checks/', {
          params: { path: monitorPath(slug, id), query: { is_change: true, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const monitorChecksQuery = (slug: string, id: number, changesOnly: boolean) =>
  infiniteQueryOptions({
    queryKey: monitorKeys.checks(slug, id, changesOnly),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<Page<Check>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/checks/', {
        params: { path: monitorPath(slug, id), query: { is_change: changesOnly || undefined, limit: PAGE_SIZE, cursor: pageParam } },
      })
      return toPage(unwrap(result), result.response)
    },
    getNextPageParam: (page) => page.cursors.next,
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
    unwrap(await api.POST('/api/0/organizations/{organization_id_or_slug}/monitors/', { params: { path: orgPath(slug) }, body })),
  update: async (slug: string, id: number, body: MonitorInput) =>
    unwrap(await api.PUT('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/', { params: { path: monitorPath(slug, id) }, body })),
  remove: async (slug: string, id: number) =>
    unwrap(await api.DELETE('/api/0/organizations/{organization_id_or_slug}/monitors/{monitor_id}/', { params: { path: monitorPath(slug, id) } })),
  // The backend can create a status page but not change or delete one; that is done in its admin.
  createStatusPage: async (slug: string, body: { name: string; isPublic: boolean }) =>
    unwrap(await api.POST('/api/0/organizations/{organization_id_or_slug}/status-pages/', { params: { path: orgPath(slug) }, body })),
}

// Where a status page is shown, and where its monitors and visibility are changed.
export const statusPageUrl = (slug: string, page: string) => `/status-pages/${slug}/${page}/`
export const STATUS_PAGE_ADMIN_URL = '/admin/uptime/statuspage/'
