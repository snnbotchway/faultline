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
  events: (slug: string, start: number) => [...releaseKeys.all(slug), 'events', start] as const,
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
 * The unresolved issues that had events in a release, most recent first. An issue is new in the
 * release when its `firstRelease` is this one; the backend has no search for that.
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

export const isNewIn = (issue: Issue, version: string) => issue.firstRelease?.version === version

type EventStats = { intervals: string[]; groups: { series: Record<string, (number | null)[]> }[] }
const EVENTS_FIELD = 'sum(quantity)'

// Error events per day across the organization since `start` (seconds), as [time in seconds, count] points.
export const dailyEventsQuery = (slug: string, start: number) =>
  queryOptions({
    queryKey: releaseKeys.events(slug, start),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<number[][]> => {
      const query = { category: 'error', interval: '1d', field: EVENTS_FIELD, start: new Date(start * 1000).toISOString(), end: new Date().toISOString() }
      // The schema declares no query for this path, though the endpoint requires one.
      const result = await api.GET('/api/0/organizations/{organization_id_or_slug}/stats_v2/', { params: { path: orgPath(slug), query } as never })
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
