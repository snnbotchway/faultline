import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import type { Issue } from './issues'
import { MAX_PAGE_SIZE, toPage, type Page } from './pagination'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
export type Release = Schemas['ReleaseSchema']
export type Deploy = Schemas['DeploySchema']
export type Commit = Schemas['CommitSchema']
export type ReleaseFile = Schemas['DebugSymbolBundleSchema']

const PAGE_SIZE = 25

export const releaseKeys = {
  all: (slug: string) => ['releases', slug] as const,
  recent: (slug: string) => [...releaseKeys.all(slug), 'recent'] as const,
  list: (slug: string) => [...releaseKeys.all(slug), 'list'] as const,
  detail: (slug: string, version: string) => [...releaseKeys.all(slug), 'detail', version] as const,
  deploys: (slug: string, version: string) => [...releaseKeys.detail(slug, version), 'deploys'] as const,
  commits: (slug: string, version: string) => [...releaseKeys.detail(slug, version), 'commits'] as const,
  files: (slug: string, version: string) => [...releaseKeys.detail(slug, version), 'files'] as const,
  issues: (slug: string, version: string) => [...releaseKeys.detail(slug, version), 'issues'] as const,
  newIssues: (slug: string) => [...releaseKeys.all(slug), 'new-issues'] as const,
  events: (slug: string, days: number) => [...releaseKeys.all(slug), 'events', days] as const,
}

// openapi-fetch encodes the version, which can contain `/` and `@`.
const releasePath = (slug: string, version: string) => ({ ...orgPath(slug), version })

// The newest releases, enough to mark the last two weeks on a time axis.
export const recentReleasesQuery = (slug: string) =>
  queryOptions({
    queryKey: releaseKeys.recent(slug),
    staleTime: 5 * 60_000,
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/releases/', {
          params: { path: orgPath(slug), query: { limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const releaseListQuery = (slug: string) =>
  infiniteQueryOptions({
    queryKey: releaseKeys.list(slug),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<Page<Release>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/releases/', {
        params: { path: orgPath(slug), query: { limit: PAGE_SIZE, cursor: pageParam } },
      })
      return toPage(unwrap(result), result.response)
    },
    getNextPageParam: (page) => page.cursors.next,
  })

export const releaseQuery = (slug: string, version: string) =>
  queryOptions({
    queryKey: releaseKeys.detail(slug, version),
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/releases/{version}/', { params: { path: releasePath(slug, version) } })),
  })

export const releaseDeploysQuery = (slug: string, version: string) =>
  queryOptions({
    queryKey: releaseKeys.deploys(slug, version),
    staleTime: 5 * 60_000,
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/releases/{version}/deploys/', { params: { path: releasePath(slug, version) } })),
  })

export const releaseCommitsQuery = (slug: string, version: string) =>
  queryOptions({
    queryKey: releaseKeys.commits(slug, version),
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/releases/{version}/commits/', { params: { path: releasePath(slug, version) } })),
  })

export const releaseFilesQuery = (slug: string, version: string) =>
  infiniteQueryOptions({
    queryKey: releaseKeys.files(slug, version),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<Page<ReleaseFile>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/releases/{version}/files/', {
        params: { path: releasePath(slug, version), query: { limit: MAX_PAGE_SIZE, cursor: pageParam } },
      })
      return toPage(unwrap(result), result.response)
    },
    getNextPageParam: (page) => page.cursors.next,
  })

/**
 * The unresolved issues that had events in a release, most recently seen first. An issue is new in
 * the release when its `firstRelease` is this one; the backend has no search for that.
 */
export const releaseIssuesQuery = (slug: string, version: string) =>
  queryOptions({
    queryKey: releaseKeys.issues(slug, version),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Page<Issue>> => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/', {
        params: { path: orgPath(slug), query: { query: `is:unresolved release:"${version.replaceAll('"', '\\"')}"`, limit: MAX_PAGE_SIZE } },
      })
      return toPage(unwrap(result), result.response)
    },
  })

export const isNewIn = (issue: Pick<Issue, 'firstRelease'>, version: string) => issue.firstRelease?.version === version

export type NewIssueCounts = { counts: Map<string, number>; complete: boolean; since?: string }

/**
 * How many unresolved issues each release brought, from one page of the newest issues. When the page
 * is full, a release older than its oldest issue may have more than it shows, so `since` marks the
 * oldest moment the counts still cover.
 */
export function countNewIssues(issues: Pick<Issue, 'firstRelease' | 'firstSeen'>[], full: boolean): NewIssueCounts {
  const counts = new Map<string, number>()
  for (const issue of issues) {
    const version = issue.firstRelease?.version
    if (version) counts.set(version, (counts.get(version) ?? 0) + 1)
  }
  return { counts, complete: !full, since: full ? issues.at(-1)?.firstSeen : undefined }
}

// The newest issues by first appearance, enough to say how many each recent release brought.
export const newIssuesByReleaseQuery = (slug: string) =>
  queryOptions({
    queryKey: releaseKeys.newIssues(slug),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/', {
        params: { path: orgPath(slug), query: { query: 'is:unresolved', sort: '-first_seen', limit: MAX_PAGE_SIZE } },
      })
      const page = toPage(unwrap(result), result.response)
      return countNewIssues(page.items, page.cursors.next !== undefined)
    },
  })

// What the backend answers for event stats. The schema declares no response body for this path.
type EventStats = { intervals: string[]; groups: { series: Record<string, (number | null)[]> }[] }
const EVENTS_FIELD = 'sum(quantity)'
const DAY_SECONDS = 86_400

// Error events per day across the organization, for the `days` days up to today, as [day start in seconds, count] points.
export const dailyEventsQuery = (slug: string, days: number) =>
  queryOptions({
    queryKey: releaseKeys.events(slug, days),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<number[][]> => {
      const today = Math.floor(Date.now() / 1000 / DAY_SECONDS) * DAY_SECONDS
      const start = new Date((today - (days - 1) * DAY_SECONDS) * 1000).toISOString()
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/stats_v2/', {
        params: { path: orgPath(slug), query: { category: 'error', interval: '1d', field: EVENTS_FIELD, start, end: new Date().toISOString() } },
      })
      // The body is parsed as JSON at runtime; only its type is missing from the schema.
      const stats = unwrap(result) as unknown as EventStats
      const counts = stats.groups[0]?.series[EVENTS_FIELD] ?? []
      return stats.intervals.map((time, index) => [Date.parse(time) / 1000, counts[index] ?? 0])
    },
  })

export const releaseActions = {
  removeFile: async (slug: string, version: string, id: string) =>
    unwrap(
      await api.DELETE('/api/0/organizations/{organization_id_or_slug}/releases/{version}/files/{file_id}/', {
        params: { path: { ...releasePath(slug, version), file_id: Number(id) } },
      }),
    ),
}
