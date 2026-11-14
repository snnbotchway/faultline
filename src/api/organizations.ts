import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from './client'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
export type InstanceSettings = Schemas['SettingsOut']
export type Organization = Schemas['OrganizationSchema']
export type OrganizationDetail = Schemas['OrganizationDetailSchema']

export const Feature = { logs: 'logs', uptime: 'uptime', email: 'email', mcp: 'mcp' } as const
export type Feature = (typeof Feature)[keyof typeof Feature]

const org = (slug: string) => ({ organization_id_or_slug: slug })

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
  queryKey: ['organizations'],
  queryFn: async () => unwrap(await api.GET('/api/0/organizations/', { params: { query: { limit: 100 } } })),
})

export const organizationQuery = (slug: string) =>
  queryOptions({
    queryKey: ['organizations', slug],
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/', { params: { path: org(slug) } })),
  })

export const projectsQuery = (slug: string) =>
  queryOptions({
    queryKey: ['organizations', slug, 'projects'],
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/projects/', {
          params: { path: org(slug), query: { limit: 100 } },
        }),
      ),
  })

export const environmentsQuery = (slug: string) =>
  queryOptions({
    queryKey: ['organizations', slug, 'environments'],
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/environments/', { params: { path: org(slug) } }),
      ),
  })

export const membersQuery = (slug: string) =>
  queryOptions({
    queryKey: ['organizations', slug, 'members'],
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/members/', {
          params: { path: org(slug), query: { limit: 100 } },
        }),
      ),
  })

export const teamsQuery = (slug: string) =>
  queryOptions({
    queryKey: ['organizations', slug, 'teams'],
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/teams/', {
          params: { path: org(slug), query: { limit: 100 } },
        }),
      ),
  })
