import type { QueryFilters } from '@tanstack/react-query'
import { organizationKeys } from './organizations'
import { projectKeys } from './projects'
import { signInAppKeys } from './sign-in-apps'

/**
 * What a change makes out of date, to be fetched again. Each entry reaches only the queries it names; a project's
 * history (errors per day, open issues, alerts) is never among them.
 */
export const stale = {
  organizations: { queryKey: organizationKeys.all, exact: true } satisfies QueryFilters,
  organization: (org: string): QueryFilters => ({ queryKey: organizationKeys.detail(org), exact: true }),
  members: (org: string): QueryFilters => ({ queryKey: organizationKeys.members(org) }),
  // The list of teams and each team's members.
  teams: (org: string): QueryFilters => ({ queryKey: organizationKeys.teams(org) }),
  // The list of projects and each project's own page.
  // The environments the scope filter offers: each one while any project shows it.
  environments: (org: string): QueryFilters => ({ queryKey: organizationKeys.environments(org) }),
  projects: (org: string): QueryFilters => ({ queryKey: organizationKeys.projects(org) }),
  project: (org: string, project: string): QueryFilters => ({ queryKey: projectKeys.detail(org, project) }),
  signInApps: (org: string): QueryFilters => ({ queryKey: signInAppKeys.all(org) }),
}
