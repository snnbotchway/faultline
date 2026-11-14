import { queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import { MAX_PAGE_SIZE } from './pagination'
import type { components } from './schema/openapi'

export type Release = components['schemas']['ReleaseSchema']

export const releaseKeys = {
  all: (slug: string) => ['releases', slug] as const,
  recent: (slug: string) => [...releaseKeys.all(slug), 'recent'] as const,
}

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
