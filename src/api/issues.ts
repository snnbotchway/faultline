import { infiniteQueryOptions, queryOptions, type InfiniteData, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import { MAX_PAGE_SIZE, fetchAllPages, toPage, type Page } from './pagination'
import type { components, operations } from './schema/openapi'

type Schemas = components['schemas']
export type Issue = Schemas['IssueSchema']
export type IssueDetail = Schemas['IssueDetailSchema']
export type IssueEvent = Schemas['IssueEventDetailSchema']
export type IssueUpdate = Schemas['UpdateIssueSchema']

type ListQuery = NonNullable<operations['apps_issue_events_api_issues_list_issues']['parameters']['query']>
export type IssueSort = NonNullable<ListQuery['sort']>
export type IssueFilters = Pick<ListQuery, 'query' | 'sort' | 'project' | 'environment' | 'start' | 'end'>

export const IssueStatus = { unresolved: 'unresolved', resolved: 'resolved', ignored: 'ignored' } as const
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus]

export const IssueKind = { default: 'default', error: 'error', csp: 'csp' } as const
export type IssueKind = (typeof IssueKind)[keyof typeof IssueKind]

export const IssueLevel = { fatal: 'fatal', error: 'error', warning: 'warning', info: 'info', debug: 'debug' } as const
export type IssueLevel = (typeof IssueLevel)[keyof typeof IssueLevel]

export const AssigneeType = { user: 'user', team: 'team' } as const
export type AssigneeType = (typeof AssigneeType)[keyof typeof AssigneeType]

export const EventEntryType = { exception: 'exception', breadcrumbs: 'breadcrumbs', request: 'request', message: 'message', csp: 'csp' } as const
export type EventEntryType = (typeof EventEntryType)[keyof typeof EventEntryType]

// Tags the screens read by name.
export const TagKey = { userId: 'user.id', userEmail: 'user.email', browser: 'browser' } as const
export type TagKey = (typeof TagKey)[keyof typeof TagKey]

export const StatsPeriod = { day: '24h', fortnight: '14d' } as const
export type StatsPeriod = (typeof StatsPeriod)[keyof typeof StatsPeriod]

const PAGE_SIZE = 50
const issuePath = (slug: string, id: string) => ({ ...orgPath(slug), issue_id: Number(id) })

export const issueKeys = {
  all: (slug: string) => ['issues', slug] as const,
  lists: (slug: string) => [...issueKeys.all(slug), 'list'] as const,
  list: (slug: string, filters: IssueFilters) => [...issueKeys.lists(slug), filters] as const,
  stats: (slug: string, ids: string[], period: StatsPeriod) => [...issueKeys.all(slug), 'stats', period, ids] as const,
  detail: (slug: string, id: string) => [...issueKeys.all(slug), 'detail', id] as const,
  event: (slug: string, id: string, eventId?: string) => [...issueKeys.detail(slug, id), 'event', eventId ?? 'latest'] as const,
  events: (slug: string, id: string, query?: string) => [...issueKeys.detail(slug, id), 'events', query] as const,
  tags: (slug: string, id: string) => [...issueKeys.detail(slug, id), 'tags'] as const,
  comments: (slug: string, id: string) => [...issueKeys.detail(slug, id), 'comments'] as const,
  userReports: (slug: string, id: string) => [...issueKeys.detail(slug, id), 'user-reports'] as const,
  hashes: (slug: string, id: string) => [...issueKeys.detail(slug, id), 'hashes'] as const,
}

export const issueListQuery = (slug: string, filters: IssueFilters) =>
  infiniteQueryOptions({
    queryKey: issueKeys.list(slug, filters),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<Page<Issue>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/', {
        params: { path: orgPath(slug), query: { ...filters, limit: PAGE_SIZE, cursor: pageParam } },
      })
      return toPage(unwrap(result), result.response)
    },
    getNextPageParam: (page) => page.cursors.next,
  })

export type IssueListData = InfiniteData<Page<Issue>, string | undefined>

// Every issue list in the cache for an organization, with the filters it was fetched for.
export function cachedIssueLists(queryClient: QueryClient, slug: string) {
  return queryClient
    .getQueriesData<IssueListData>({ queryKey: issueKeys.lists(slug) })
    .map(([key, data]): { key: QueryKey; filters: IssueFilters; data: IssueListData | undefined } => ({ key, filters: key.at(-1) as IssueFilters, data }))
}

export const issueStatsQuery = (slug: string, ids: string[], period: StatsPeriod) =>
  queryOptions({
    queryKey: issueKeys.stats(slug, ids, period),
    enabled: ids.length > 0,
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/issues-stats/', {
          params: { path: orgPath(slug), query: { groups: ids.map(Number), statsPeriod: period } },
        }),
      ),
  })

export const issueQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: issueKeys.detail(slug, id),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/', {
          params: { path: issuePath(slug, id) },
        }),
      ),
  })

// `eventId` is the server event id, or omitted for the latest event.
export const issueEventQuery = (slug: string, id: string, eventId?: string) =>
  queryOptions({
    queryKey: issueKeys.event(slug, id, eventId),
    queryFn: async () =>
      unwrap(
        eventId
          ? await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/events/{event_id}/', {
              params: { path: { ...issuePath(slug, id), event_id: eventId } },
            })
          : await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/events/latest/', {
              params: { path: issuePath(slug, id) },
            }),
      ),
  })

export const issueEventsQuery = (slug: string, id: string, query?: string) =>
  infiniteQueryOptions({
    queryKey: issueKeys.events(slug, id, query),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/events/', {
        params: { path: issuePath(slug, id), query: { query, cursor: pageParam, limit: PAGE_SIZE } },
      })
      return toPage(unwrap(result), result.response)
    },
    getNextPageParam: (page) => page.cursors.next,
  })

export const issueTagsQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: issueKeys.tags(slug, id),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/tags/', {
          params: { path: issuePath(slug, id) },
        }),
      ),
  })

export const issueCommentsQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: issueKeys.comments(slug, id),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/comments/', {
          params: { path: issuePath(slug, id), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const issueUserReportsQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: issueKeys.userReports(slug, id),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/user-reports/', {
          params: { path: issuePath(slug, id), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const issueHashesQuery = (slug: string, id: string) =>
  queryOptions({
    queryKey: issueKeys.hashes(slug, id),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/hashes/', {
          params: { path: issuePath(slug, id), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const rawEventUrl = (slug: string, id: string, eventId: string) =>
  `/api/0/organizations/${encodeURIComponent(slug)}/issues/${encodeURIComponent(id)}/events/${encodeURIComponent(eventId)}/json/`

// Bulk actions take explicit ids, or the current filters to act on every match.
export type IssueSelection = { ids: string[] } | { filters: IssueFilters }

// The backend treats a request without ids as "every match", and the client drops
// empty arrays, so an empty selection must never reach it.
export function selectionQuery(selection: IssueSelection) {
  if (!('ids' in selection)) return selection.filters
  if (selection.ids.length === 0) throw new Error('Select at least one issue.')
  if (selection.ids.some((id) => !/^\d+$/.test(id))) throw new Error(`Unknown issue: ${selection.ids.join(', ')}`)
  return { id: selection.ids.map(Number) }
}

export const issueActions = {
  update: async (slug: string, selection: IssueSelection, body: IssueUpdate) =>
    unwrap(
      await api.PUT('/api/0/organizations/{organization_id_or_slug}/issues/', {
        params: { path: orgPath(slug), query: selectionQuery(selection) },
        body,
      }),
    ),
  // The newest issue survives; all issues must be in one project.
  merge: async (slug: string, ids: string[]) => {
    if (ids.length < 2) throw new Error('Select at least two issues to merge.')
    return issueActions.update(slug, { ids }, { merge: 1 })
  },
  remove: async (slug: string, selection: IssueSelection) =>
    unwrap(
      await api.DELETE('/api/0/organizations/{organization_id_or_slug}/issues/', {
        params: { path: orgPath(slug), query: selectionQuery(selection) },
      }),
    ),
  updateOne: async (slug: string, id: string, body: IssueUpdate) =>
    unwrap(
      await api.PUT('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/', {
        params: { path: issuePath(slug, id) },
        body,
      }),
    ),
  comment: async (slug: string, id: string, text: string) =>
    unwrap(
      await api.POST('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/comments/', {
        params: { path: issuePath(slug, id) },
        body: { data: { text } },
      }),
    ),
  editComment: async (slug: string, id: string, commentId: number, text: string) =>
    unwrap(
      await api.PUT('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/comments/{comment_id}/', {
        params: { path: { ...issuePath(slug, id), comment_id: commentId } },
        body: { data: { text } },
      }),
    ),
  deleteComment: async (slug: string, id: string, commentId: number) =>
    unwrap(
      await api.DELETE('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/comments/{comment_id}/', {
        params: { path: { ...issuePath(slug, id), comment_id: commentId } },
      }),
    ),
  // The screen must keep at least one hash on the issue.
  unmerge: async (slug: string, id: string, hashIds: string[]) => {
    if (hashIds.length === 0) throw new Error('Select at least one fingerprint to split off.')
    return unwrap(
      await api.DELETE('/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/hashes/', {
        params: { path: issuePath(slug, id), query: { id: hashIds } },
      }),
    )
  },
}
