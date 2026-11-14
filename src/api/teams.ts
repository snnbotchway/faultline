import { queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import { organizationKeys } from './organizations'
import { MAX_PAGE_SIZE, fetchAllPages } from './pagination'
import type { components } from './schema/openapi'

export type Team = components['schemas']['TeamSchema']

export const TEAM_SLUG_MAX = 50
export const TEAM_SLUG_PATTERN = /^[-a-zA-Z0-9_]+$/

const teamPath = (org: string, team: string) => ({ ...orgPath(org), team_slug: team })
const membershipPath = (org: string, memberId: string, team: string) => ({ ...teamPath(org, team), member_id: Number(memberId) })

export const teamKeys = {
  members: (org: string, team: string) => [...organizationKeys.teams(org), team, 'members'] as const,
}

export const teamMembersQuery = (org: string, team: string) =>
  queryOptions({
    queryKey: teamKeys.members(org, team),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/teams/{organization_id_or_slug}/{team_slug}/members/', {
          params: { path: teamPath(org, team), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const teamActions = {
  create: async (org: string, slug: string) =>
    unwrap(await api.POST('/api/0/organizations/{organization_id_or_slug}/teams/', { params: { path: orgPath(org) }, body: { slug } })),
  rename: async (org: string, team: string, slug: string) =>
    unwrap(await api.PUT('/api/0/teams/{organization_id_or_slug}/{team_slug}/', { params: { path: teamPath(org, team) }, body: { slug } })),
  remove: async (org: string, team: string) =>
    unwrap(await api.DELETE('/api/0/teams/{organization_id_or_slug}/{team_slug}/', { params: { path: teamPath(org, team) } })),
  addMember: async (org: string, team: string, memberId: string) =>
    unwrap(
      await api.POST('/api/0/organizations/{organization_id_or_slug}/members/{member_id}/teams/{team_slug}/', {
        params: { path: membershipPath(org, memberId, team) },
      }),
    ),
  removeMember: async (org: string, team: string, memberId: string) =>
    unwrap(
      await api.DELETE('/api/0/organizations/{organization_id_or_slug}/members/{member_id}/teams/{team_slug}/', {
        params: { path: membershipPath(org, memberId, team) },
      }),
    ),
}
