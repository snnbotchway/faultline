import { queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import { MAX_PAGE_SIZE, fetchAllPages } from './pagination'
import type { components, operations } from './schema/openapi'

type Schemas = components['schemas']
export type TransactionGroup = Schemas['TransactionGroupSchema']
export type SpanGroup = Schemas['SpanGroupSchema']
export type NPlusOnePattern = Schemas['NPlusOnePatternSchema']
export type TrendDay = Schemas['TransactionTrendSchema']

type GroupQuery = NonNullable<operations['apps_performance_api_list_transaction_groups']['parameters']['query']>
export type TransactionSort = NonNullable<GroupQuery['sort']>
export type TransactionFilters = Pick<GroupQuery, 'query' | 'sort' | 'project'>

// Span breakdowns, trends and repeated queries come from cold storage and cover the last 7 days. Without
// cold storage the backend answers them with empty lists.
type RepeatQuery = NonNullable<operations['apps_performance_api_list_n_plus_one_patterns']['parameters']['query']>
export type RepeatFilters = Pick<RepeatQuery, 'project'>

const groupPath = (slug: string, id: string) => ({ ...orgPath(slug), id: Number(id) })

export const performanceKeys = {
  all: (slug: string) => ['performance', slug] as const,
  groups: (slug: string, filters: TransactionFilters) => [...performanceKeys.all(slug), 'groups', filters] as const,
  group: (slug: string, id: string) => [...performanceKeys.all(slug), 'group', id] as const,
  spans: (slug: string, id: string) => [...performanceKeys.group(slug, id), 'spans'] as const,
  trend: (slug: string, id: string) => [...performanceKeys.group(slug, id), 'trend'] as const,
  nPlusOne: (slug: string, filters: RepeatFilters) => [...performanceKeys.all(slug), 'n-plus-one', filters] as const,
}

// Every transaction group, so the screen can rank them against each other. A group's count, average and
// percentiles cover everything it has ever received; the backend has no way to narrow them to a period
// or an environment.
export const transactionGroupsQuery = (slug: string, filters: TransactionFilters) =>
  queryOptions({
    queryKey: performanceKeys.groups(slug, filters),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/transaction-groups/', {
          params: { path: orgPath(slug), query: { ...filters, cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const transactionGroupQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: performanceKeys.group(slug, id),
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/transaction-groups/{id}/', { params: { path: groupPath(slug, id) } })),
  })

export const transactionSpansQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: performanceKeys.spans(slug, id),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/transaction-groups/{id}/spans/', {
          params: { path: groupPath(slug, id) },
        }),
      ),
  })

// One row per day that has spans.
export const transactionTrendQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: performanceKeys.trend(slug, id),
    staleTime: 5 * 60_000,
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/transaction-groups/{id}/trend/', {
          params: { path: groupPath(slug, id) },
        }),
      ),
  })

// Queries that run more than five times per request, most repeated first.
export const nPlusOneQuery = (slug: string, filters: RepeatFilters = {}) =>
  queryOptions({
    queryKey: performanceKeys.nPlusOne(slug, filters),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/n-plus-one/', {
          params: { path: orgPath(slug), query: { ...filters, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })
