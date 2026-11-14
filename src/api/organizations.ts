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

export const Scope = {
  eventWrite: 'event:write',
  eventAdmin: 'event:admin',
  projectWrite: 'project:write',
  projectAdmin: 'project:admin',
  projectReleases: 'project:releases',
  teamWrite: 'team:write',
  teamAdmin: 'team:admin',
  memberWrite: 'member:write',
  orgWrite: 'org:write',
  orgAdmin: 'org:admin',
} as const
export type Scope = (typeof Scope)[keyof typeof Scope]

type Access = OrganizationDetail['access'] | undefined

// Changing issues (status, assignee, merge, delete) needs either scope; splitting merged issues needs admin.
export const canWriteEvents = (access: Access) => !!access && (access.includes(Scope.eventWrite) || access.includes(Scope.eventAdmin))
export const canAdminEvents = (access: Access) => !!access && access.includes(Scope.eventAdmin)
// Monitors, status pages and alert rules need either project scope; deleting a rule needs admin.
export const canWriteProjects = (access: Access) => !!access && (access.includes(Scope.projectWrite) || access.includes(Scope.projectAdmin))
export const canAdminProjects = (access: Access) => !!access && access.includes(Scope.projectAdmin)
// Releases, their files included, are read and changed with this scope alone.
export const canManageReleases = (access: Access) => !!access && access.includes(Scope.projectReleases)

// Controls the user cannot use are left out, so every gate fails closed until the organization has loaded.
export const hasScope = (access: Access, scope: Scope) => !!access && access.includes(scope)

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

// The providers one organization signs in with, for its own sign-in page. Unknown organizations have none.
export const loginSettingsQuery = (slug: string) =>
  queryOptions({
    queryKey: ['instance-settings', slug],
    queryFn: async () => unwrap(await api.GET('/api/settings/{organization_slug}/', { params: { path: { organization_slug: slug } } })),
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

// A project's slug from the organization's projects, which ids in logs and transactions refer to.
export const projectSlug = (projects: { id: string | number; slug?: string | null }[] | undefined, id: number | undefined) =>
  projects?.find((project) => Number(project.id) === id)?.slug ?? undefined

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

export const ORGANIZATION_NAME_MAX = 200

export const organizationActions = {
  create: async (name: string) => unwrap(await api.POST('/api/0/organizations/', { body: { name } })),
  // The name is the only thing the backend lets an organization change about itself.
  rename: async (slug: string, name: string) =>
    unwrap(await api.PUT('/api/0/organizations/{organization_id_or_slug}/', { params: { path: orgPath(slug) }, body: { name } })),
  remove: async (slug: string) => unwrap(await api.DELETE('/api/0/organizations/{organization_id_or_slug}/', { params: { path: orgPath(slug) } })),
}
