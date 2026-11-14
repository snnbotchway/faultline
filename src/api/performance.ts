import { queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import { MAX_PAGE_SIZE, toPage, type Page } from './pagination'
import type { components, operations } from './schema/openapi'

type Schemas = components['schemas']
export type TransactionGroup = Schemas['TransactionGroupSchema']
export type SpanGroup = Schemas['SpanGroupSchema']
export type NPlusOnePattern = Schemas['NPlusOnePatternSchema']
export type TrendDay = Schemas['TransactionTrendSchema']

type GroupQuery = NonNullable<operations['apps_performance_api_list_transaction_groups']['parameters']['query']>
export type TransactionSort = NonNullable<GroupQuery['sort']>
export type TransactionFilters = Pick<GroupQuery, 'query' | 'sort' | 'project' | 'start' | 'end'>

type SpanQuery = NonNullable<operations['apps_performance_api_list_span_groups']['parameters']['query']>
export type SpanSort = NonNullable<SpanQuery['sort']>
export type SpanFilters = Pick<SpanQuery, 'op' | 'sort' | 'project' | 'start' | 'end'>

// Span breakdowns, trends, span groups and N+1 patterns come from cold storage and default to the last 7 days.
export type Period = { start?: string; end?: string }

const groupPath = (slug: string, id: string) => ({ ...orgPath(slug), id: Number(id) })

export const performanceKeys = {
  all: (slug: string) => ['performance', slug] as const,
  groups: (slug: string, filters: TransactionFilters) => [...performanceKeys.all(slug), 'groups', filters] as const,
  group: (slug: string, id: string) => [...performanceKeys.all(slug), 'group', id] as const,
  spans: (slug: string, id: string, period: Period) => [...performanceKeys.group(slug, id), 'spans', period] as const,
  trend: (slug: string, id: string, period: Period) => [...performanceKeys.group(slug, id), 'trend', period] as const,
  spanGroups: (slug: string, filters: SpanFilters) => [...performanceKeys.all(slug), 'span-groups', filters] as const,
  nPlusOne: (slug: string, period: Period) => [...performanceKeys.all(slug), 'n-plus-one', period] as const,
}

// A group's count, average and percentiles cover everything it has ever received; `start` and `end`
// only choose which groups are listed, by when they were last seen.
export const transactionGroupsQuery = (slug: string, filters: TransactionFilters) =>
  queryOptions({
    queryKey: performanceKeys.groups(slug, filters),
    queryFn: async (): Promise<Page<TransactionGroup>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/transaction-groups/', {
        params: { path: orgPath(slug), query: { ...filters, limit: MAX_PAGE_SIZE } },
      })
      return toPage(unwrap(result), result.response)
    },
  })

export const transactionGroupQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: performanceKeys.group(slug, id),
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/transaction-groups/{id}/', { params: { path: groupPath(slug, id) } })),
  })

export const transactionSpansQuery = (slug: string, id: string, period: Period = {}) =>
  queryOptions({
    queryKey: performanceKeys.spans(slug, id, period),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/transaction-groups/{id}/spans/', {
          params: { path: groupPath(slug, id), query: period },
        }),
      ),
  })

// One row per day that has spans.
export const transactionTrendQuery = (slug: string, id: string, period: Period = {}) =>
  queryOptions({
    queryKey: performanceKeys.trend(slug, id, period),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/transaction-groups/{id}/trend/', {
          params: { path: groupPath(slug, id), query: period },
        }),
      ),
  })

export const spanGroupsQuery = (slug: string, filters: SpanFilters = {}) =>
  queryOptions({
    queryKey: performanceKeys.spanGroups(slug, filters),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/span-groups/', {
          params: { path: orgPath(slug), query: { ...filters, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

// Spans that repeat more than five times per request, most repeated first.
export const nPlusOneQuery = (slug: string, period: Period = {}) =>
  queryOptions({
    queryKey: performanceKeys.nPlusOne(slug, period),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/n-plus-one/', {
          params: { path: orgPath(slug), query: { ...period, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })
