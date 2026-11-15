import type { LinkProps } from '@tanstack/react-router'
import type { Member } from '@/api/members'
import type { Organization } from '@/api/organizations'
import type { Project } from '@/api/projects'
import type { SignInApp } from '@/api/sign-in-apps'
import type { Team } from '@/api/teams'
import { messages, percent } from '@/i18n'
import { hasWords, searchWords } from '@/lib/text'
import { memberName, teamLabel, teamList } from './labels'
import { platformName } from './platforms'
import { ProjectTab } from './project-tabs'
import { TeamTab } from './team-tabs'

// One thing the settings search can land on: where it sits, what it is set to, and the page that changes it.
export type Entry = { path: string[]; value: string; link: LinkProps }

export function settingsEntries({
  organization,
  members,
  teams,
  projects,
  signInApps,
  usage,
  version,
}: {
  organization: Pick<Organization, 'slug' | 'name'>
  members: Member[]
  teams: Team[]
  projects: Project[]
  // Only for someone who may manage them.
  signInApps?: SignInApp[]
  usage?: string
  version?: string
}): Entry[] {
  const org = organization.slug
  const { settings: t, common } = messages()
  const words = t.search
  return [
    { path: [org, t.name], value: organization.name, link: { to: '/$org/settings', params: { org } } },
    { path: [org, t.usage], value: usage ?? '', link: { to: '/$org/settings/subscription', params: { org } } },
    { path: [org, t.deleteOrganization], value: '', link: { to: '/$org/settings', params: { org } } },
    { path: [t.members, t.inviteMembers], value: '', link: { to: '/$org/settings/members/new', params: { org } } },
    ...members.map((member) => ({
      path: [t.members, memberName(member)],
      value: `${member.email} · ${member.pending ? words.invited : t.roles.names[member.role]}`,
      link: { to: '/$org/settings/members/$memberId', params: { org, memberId: member.id } } as LinkProps,
    })),
    ...teams.map((team) => ({
      path: [t.teams, teamLabel(team.slug)],
      value: common.members(team.memberCount),
      link: { to: '/$org/settings/teams/$team/$tab', params: { org, team: team.slug, tab: TeamTab.members } } as LinkProps,
    })),
    ...(signInApps
      ? [
          { path: [t.signInApps.title, words.newSignInApp], value: words.singleSignOn, link: { to: '/$org/settings', params: { org } } as LinkProps },
          ...signInApps.map((app) => ({ path: [t.signInApps.title, app.name], value: app.serverUrl ?? app.brand, link: { to: '/$org/settings', params: { org } } as LinkProps })),
        ]
      : []),
    ...projects.flatMap((project) => {
      const slug = project.slug ?? ''
      const at = (name: string, value: string, tab: ProjectTab): Entry => ({
        path: [slug, name],
        value,
        link: { to: '/$org/settings/projects/$project', params: { org, project: slug }, search: { tab } },
      })
      return [
        at(t.name, project.name, ProjectTab.general),
        at(words.platform, platformName(project.platform), ProjectTab.general),
        at(words.teamsWithAccess, teamList(project.teams.map((team) => team.slug)), ProjectTab.general),
        at(words.eventsToDrop, percent(project.eventThrottleRate), ProjectTab.general),
        at(words.deleteProject, '', ProjectTab.general),
        at(words.setUp, project.firstEvent ? '' : words.noEventsYet, ProjectTab.setup),
        at(words.clientKeys, t.keys.dsn, ProjectTab.keys),
        at(words.environments, '', ProjectTab.environments),
      ]
    }),
    { path: [t.server, t.systemInfo], value: version ?? '', link: { to: '/system-info' } },
  ]
}

// Every word of the query has to appear somewhere in the entry, in any order.
export function matchEntries(entries: Entry[], query: string): Entry[] {
  const words = searchWords(query)
  if (!words.length) return []
  return entries.filter((entry) => hasWords(`${entry.path.join(' ')} ${entry.value}`, words))
}
