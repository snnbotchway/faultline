import { queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import { MAX_PAGE_SIZE, fetchAllPages } from './pagination'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
export type InstanceSettings = Schemas['SettingsOut']
export type Organization = Schemas['OrganizationSchema']
export type OrganizationDetail = Schemas['OrganizationDetailSchema']

export const Feature = { logs: 'logs', uptime: 'uptime', email: 'email', mcp: 'mcp' } as const
export type Feature = (typeof Feature)[keyof typeof Feature]

export const organizationKeys = {
  all: ['organizations'] as const,
  detail: (slug: string) => [...organizationKeys.all, slug] as const,
  projects: (slug: string) => [...organizationKeys.detail(slug), 'projects'] as const,
  environments: (slug: string) => [...organizationKeys.detail(slug), 'environments'] as const,
  members: (slug: string) => [...organizationKeys.detail(slug), 'members'] as const,
  teams: (slug: string) => [...organizationKeys.detail(slug), 'teams'] as const,
}

export const instanceSettingsQuery = queryOptions({
  queryKey: ['instance-settings'],
  queryFn: async () => unwrap(await api.GET('/api/settings/')),
  staleTime: Infinity,
})

export const currentUserQuery = queryOptions({
  queryKey: ['users', 'me'],
  queryFn: async () => unwrap(await api.GET('/api/0/users/{user_id}/', { params: { path: { user_id: 'me' } } })),
})

export const organizationsQuery = queryOptions({
  queryKey: organizationKeys.all,
  queryFn: () => fetchAllPages((cursor) => api.GET('/api/0/organizations/', { params: { query: { cursor, limit: MAX_PAGE_SIZE } } })),
})

export const organizationQuery = (slug: string) =>
  queryOptions({
    queryKey: organizationKeys.detail(slug),
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/', { params: { path: orgPath(slug) } })),
  })

export const projectsQuery = (slug: string) =>
  queryOptions({
    queryKey: organizationKeys.projects(slug),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/projects/', {
          params: { path: orgPath(slug), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const environmentsQuery = (slug: string) =>
  queryOptions({
    queryKey: organizationKeys.environments(slug),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/environments/', {
          params: { path: orgPath(slug), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const membersQuery = (slug: string) =>
  queryOptions({
    queryKey: organizationKeys.members(slug),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/members/', {
          params: { path: orgPath(slug), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const teamsQuery = (slug: string) =>
  queryOptions({
    queryKey: organizationKeys.teams(slug),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/organizations/{organization_id_or_slug}/teams/', {
          params: { path: orgPath(slug), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })
