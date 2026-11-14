import { queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import { organizationKeys } from './organizations'
import { MAX_PAGE_SIZE, fetchAllPages, toPage } from './pagination'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
export type Project = Schemas['ProjectTeamSchema']
export type ProjectDetail = Schemas['ProjectOrganizationSchema']
export type ProjectKey = Schemas['ProjectKeySchema']
export type ProjectEnvironment = Schemas['EnvironmentProjectSchema']

export const PROJECT_NAME_MAX = 64
export const PROJECT_KEY_NAME_MAX = 64

const projectPath = (org: string, project: string) => ({ ...orgPath(org), project_slug: project })

export const projectKeys = {
  detail: (org: string, project: string) => [...organizationKeys.projects(org), project] as const,
  keys: (org: string, project: string) => [...projectKeys.detail(org, project), 'keys'] as const,
  environments: (org: string, project: string) => [...projectKeys.detail(org, project), 'environments'] as const,
  // Kept apart from the organization's keys: a change to settings never makes a project's history stale.
  activity: (org: string, id: string) => ['project-activity', org, id] as const,
  alertCount: (org: string, project: string) => ['project-alert-count', org, project] as const,
}

export const projectQuery = (org: string, project: string) =>
  queryOptions({
    queryKey: projectKeys.detail(org, project),
    queryFn: async () =>
      unwrap(await api.GET('/api/0/projects/{organization_id_or_slug}/{project_slug}/', { params: { path: projectPath(org, project) } })),
  })

export const projectKeysQuery = (org: string, project: string) =>
  queryOptions({
    queryKey: projectKeys.keys(org, project),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/projects/{organization_id_or_slug}/{project_slug}/keys/', {
          params: { path: projectPath(org, project), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const projectEnvironmentsQuery = (org: string, project: string) =>
  queryOptions({
    queryKey: projectKeys.environments(org, project),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/projects/{organization_id_or_slug}/{project_slug}/environments/', {
          // The backend lists only shown environments unless asked for all, and a hidden one must stay here to be shown again.
          params: { path: projectPath(org, project), query: { cursor, limit: MAX_PAGE_SIZE, visibility: 'all' } },
        }),
      ),
  })

// The environment names a filter offers: hidden ones are left out.
export const shownEnvironmentNames = (environments: ProjectEnvironment[] | undefined) =>
  (environments ?? []).filter((environment) => !environment.isHidden).map((environment) => environment.name)

const DAY = 24 * 3600 * 1000
export const ACTIVITY_DAYS = 14

// The days a project's activity covers, oldest first, ending with today (UTC, as the backend buckets them).
export function activityDays(now: Date): number[] {
  const today = Math.floor(now.getTime() / DAY) * DAY
  return Array.from({ length: ACTIVITY_DAYS }, (_, index) => today - (ACTIVITY_DAYS - 1 - index) * DAY)
}

// The schema leaves this response untyped. A day without events comes back as null.
type StatsResponse = { intervals: string[]; groups: { series: Record<string, (number | null)[]> }[] }

export type ProjectActivity = { buckets: number[]; unresolved: number; capped: boolean; lastSeen?: string }

// What the projects list shows beside a project: errors per day, how many issues are open, and when it last broke.
export const projectActivityQuery = (org: string, id: string) =>
  queryOptions({
    queryKey: projectKeys.activity(org, id),
    staleTime: 60_000,
    queryFn: async (): Promise<ProjectActivity> => {
      const days = activityDays(new Date())
      const project = [Number(id)]
      const [stats, open, latest] = await Promise.all([
        api.GET('/api/0/organizations/{organization_id_or_slug}/stats_v2/', {
          params: {
            path: orgPath(org),
            query: {
              category: 'error',
              field: 'sum(quantity)',
              interval: '1d',
              project,
              start: new Date(days[0]!).toISOString(),
              end: new Date(days.at(-1)! + DAY).toISOString(),
            },
          },
        }),
        api.GET('/api/0/organizations/{organization_id_or_slug}/issues/', {
          params: { path: orgPath(org), query: { project, query: 'is:unresolved', limit: 1 } },
        }),
        api.GET('/api/0/organizations/{organization_id_or_slug}/issues/', {
          params: { path: orgPath(org), query: { project, query: '', sort: '-last_seen', limit: 1 } },
        }),
      ])
      const { intervals, groups } = unwrap(stats) as unknown as StatsResponse
      const series = groups[0]?.series['sum(quantity)'] ?? []
      const byDay = new Map(intervals.map((interval, index) => [new Date(interval).getTime(), series[index] ?? 0]))
      const page = toPage(unwrap(open), open.response)
      return {
        buckets: days.map((day) => byDay.get(day) ?? 0),
        unresolved: page.hits ?? page.items.length,
        capped: page.hits !== undefined && page.hits === page.maxHits,
        lastSeen: unwrap(latest)[0]?.lastSeen,
      }
    },
  })

// How many alerts a project has, for its row in the projects list. One item is fetched; the header carries the count.
export const projectAlertCountQuery = (org: string, project: string) =>
  queryOptions({
    queryKey: projectKeys.alertCount(org, project),
    staleTime: 60_000,
    queryFn: async () => {
      const result = await api.GET('/api/0/projects/{organization_id_or_slug}/{project_slug}/alerts/', {
        params: { path: projectPath(org, project), query: { limit: 1 } },
      })
      const page = toPage(unwrap(result), result.response)
      return page.hits ?? page.items.length
    },
  })

// The issue a project broke on most recently: what the set-up step shows once the first event is in.
export const latestIssueQuery = (org: string, id: string) =>
  queryOptions({
    queryKey: [...projectKeys.activity(org, id), 'latest'] as const,
    queryFn: async () =>
      unwrap(
        await api.GET('/api/0/organizations/{organization_id_or_slug}/issues/', {
          params: { path: orgPath(org), query: { project: [Number(id)], query: '', sort: '-last_seen', limit: 1 } },
        }),
      )[0] ?? null,
  })

export type ProjectInput = { name: string; platform?: string | null; eventThrottleRate?: number }

export const projectActions = {
  // A project is created inside a team, which is how its first members get access.
  create: async (org: string, team: string, body: ProjectInput) =>
    unwrap(
      await api.POST('/api/0/teams/{organization_id_or_slug}/{team_slug}/projects/', {
        params: { path: { ...orgPath(org), team_slug: team } },
        body,
      }),
    ),
  update: async (org: string, project: string, body: ProjectInput) =>
    unwrap(await api.PUT('/api/0/projects/{organization_id_or_slug}/{project_slug}/', { params: { path: projectPath(org, project) }, body })),
  remove: async (org: string, project: string) =>
    unwrap(await api.DELETE('/api/0/projects/{organization_id_or_slug}/{project_slug}/', { params: { path: projectPath(org, project) } })),
  addTeam: async (org: string, project: string, team: string) =>
    unwrap(
      await api.POST('/api/0/projects/{organization_id_or_slug}/{project_slug}/teams/{team_slug}/', {
        params: { path: { ...projectPath(org, project), team_slug: team } },
      }),
    ),
  removeTeam: async (org: string, project: string, team: string) =>
    unwrap(
      await api.DELETE('/api/0/projects/{organization_id_or_slug}/{project_slug}/teams/{team_slug}/', {
        params: { path: { ...projectPath(org, project), team_slug: team } },
      }),
    ),
  // A key's rate limit is left unset: GlitchTip 7.0.0 stores it but does not enforce it.
  createKey: async (org: string, project: string, name: string) =>
    unwrap(await api.POST('/api/0/projects/{organization_id_or_slug}/{project_slug}/keys/', { params: { path: projectPath(org, project) }, body: { name } })),
  removeKey: async (org: string, project: string, keyId: string) =>
    unwrap(
      await api.DELETE('/api/0/projects/{organization_id_or_slug}/{project_slug}/keys/{key_id}/', {
        params: { path: { ...projectPath(org, project), key_id: keyId } },
      }),
    ),
  setEnvironmentHidden: async (org: string, project: string, name: string, isHidden: boolean) =>
    unwrap(
      await api.PUT('/api/0/projects/{organization_id_or_slug}/{project_slug}/environments/{name}/', {
        params: { path: { ...projectPath(org, project), name } },
        body: { name, isHidden },
      }),
    ),
}
