import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { api, orgPath, retryUnlessMissing, unwrap } from './client'
import { toPage, type Page } from './pagination'
import type { components, operations } from './schema/openapi'

type Schemas = components['schemas']
export type LogEvent = Schemas['LogEventSchema']
export type LogStats = Schemas['LogStatsSchema']
export type LogResource = Schemas['LogResourceSchema']

type ListQuery = NonNullable<operations['apps_logs_api_list_logs']['parameters']['query']>
export type LogFilters = Pick<ListQuery, 'query' | 'level' | 'service' | 'environment' | 'host' | 'traceId' | 'project' | 'start' | 'end'>

export const LogLevel = { trace: 'trace', debug: 'debug', info: 'info', warn: 'warn', error: 'error', fatal: 'fatal' } as const
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]

export const LogResourceType = { service: 'service', environment: 'environment', host: 'host' } as const
export type LogResourceType = (typeof LogResourceType)[keyof typeof LogResourceType]

// The backend takes up to 200 logs a page.
const PAGE_SIZE = 200

export const logKeys = {
  all: (slug: string) => ['logs', slug] as const,
  list: (slug: string, filters: LogFilters) => [...logKeys.all(slug), 'list', filters] as const,
  detail: (slug: string, id: string) => [...logKeys.all(slug), 'detail', id] as const,
  hits: (slug: string, filters: LogFilters) => [...logKeys.all(slug), 'hits', filters] as const,
  stats: (slug: string, filters: LogFilters) => [...logKeys.all(slug), 'stats', filters] as const,
  resources: (slug: string) => [...logKeys.all(slug), 'resources'] as const,
}

// Newest first. Only the first page carries the number of matches.
export const logListQuery = (slug: string, filters: LogFilters) =>
  infiniteQueryOptions({
    queryKey: logKeys.list(slug, filters),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<Page<LogEvent>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/logs/', {
        params: { path: orgPath(slug), query: { ...filters, limit: PAGE_SIZE, cursor: pageParam } },
      })
      return toPage(unwrap(result), result.response)
    },
    getNextPageParam: (page) => page.cursors.next,
  })

// How many logs match, without fetching them. The backend stops counting at `maxHits`.
export const logHitsQuery = (slug: string, filters: LogFilters) =>
  queryOptions({
    queryKey: logKeys.hits(slug, filters),
    queryFn: async () => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/logs/', { params: { path: orgPath(slug), query: { ...filters, limit: 1 } } })
      const { hits = 0, maxHits } = toPage(unwrap(result), result.response)
      return { hits, capped: maxHits !== undefined && hits >= maxHits }
    },
  })

export const logQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: logKeys.detail(slug, id),
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/logs/{log_id}/', { params: { path: { ...orgPath(slug), log_id: id } } })),
    retry: retryUnlessMissing,
  })

// Hourly counts per level. The text search and the host and trace filters do not apply to them.
export const logStatsQuery = (slug: string, filters: LogFilters) =>
  queryOptions({
    queryKey: logKeys.stats(slug, filters),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/logs/stats/', {
          params: {
            path: orgPath(slug),
            query: {
              project: filters.project,
              level: filters.level,
              service: filters.service ? [filters.service] : undefined,
              environment: filters.environment ? [filters.environment] : undefined,
              start: filters.start,
              end: filters.end,
            },
          },
        }),
      ),
  })

// The services, environments and hosts that have sent logs, most recent first.
export const logResourcesQuery = (slug: string) =>
  queryOptions({
    queryKey: logKeys.resources(slug),
    staleTime: 5 * 60_000,
    queryFn: async () => unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/logs/resources/', { params: { path: orgPath(slug) } })),
  })
