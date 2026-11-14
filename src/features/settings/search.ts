import type { LinkProps } from '@tanstack/react-router'
import type { Member } from '@/api/members'
import type { Organization } from '@/api/organizations'
import type { Project } from '@/api/projects'
import type { SignInApp } from '@/api/sign-in-apps'
import type { Team } from '@/api/teams'
import { hasWords, plural, searchWords } from '@/lib/text'
import { memberName, teamLabel, teamList } from './labels'
import { platformName } from './platforms'
import { ProjectTab } from './project-tabs'
import { ROLE_LABEL } from './roles'
import { TeamTab } from './team-tabs'

// One thing the settings search can land on: where it sits, what it is set to, and the page that changes it.
export type Entry = { path: string[]; value: string; link: LinkProps }

export function settingsEntries({
  organization,
  members,
  teams,
  projects,
  signInApps,
  version,
}: {
  organization: Pick<Organization, 'slug' | 'name'>
  members: Member[]
  teams: Team[]
  projects: Project[]
  // Only for someone who may manage them.
  signInApps?: SignInApp[]
  version?: string
}): Entry[] {
  const org = organization.slug
  return [
    { path: [org, 'Name'], value: organization.name, link: { to: '/$org/settings', params: { org } } },
    { path: [org, 'Usage'], value: 'Events in the last 30 days', link: { to: '/$org/settings/subscription', params: { org } } },
    { path: [org, 'Delete organization'], value: '', link: { to: '/$org/settings', params: { org } } },
    { path: ['Members', 'Invite members'], value: '', link: { to: '/$org/settings/members/new', params: { org } } },
    ...members.map((member) => ({
      path: ['Members', memberName(member)],
      value: `${member.email} · ${member.pending ? 'Invited' : ROLE_LABEL[member.role]}`,
      link: { to: '/$org/settings/members/$memberId', params: { org, memberId: member.id } } as LinkProps,
    })),
    ...teams.map((team) => ({
      path: ['Teams', teamLabel(team.slug)],
      value: plural(team.memberCount, 'member'),
      link: { to: '/$org/settings/teams/$team/$tab', params: { org, team: team.slug, tab: TeamTab.members } } as LinkProps,
    })),
    ...(signInApps
      ? [
          { path: ['Sign-in apps', 'New sign-in app'], value: 'single sign-on', link: { to: '/$org/settings', params: { org } } as LinkProps },
          ...signInApps.map((app) => ({ path: ['Sign-in apps', app.name], value: app.serverUrl ?? app.brand, link: { to: '/$org/settings', params: { org } } as LinkProps })),
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
        at('Name', project.name, ProjectTab.general),
        at('Platform', platformName(project.platform), ProjectTab.general),
        at('Teams with access', teamList(project.teams.map((team) => team.slug)), ProjectTab.general),
        at('Events to drop', `${project.eventThrottleRate}%`, ProjectTab.general),
        at('Delete project', '', ProjectTab.general),
        at('Set up', project.firstEvent ? '' : 'No events yet', ProjectTab.setup),
        at('Client keys', 'DSN', ProjectTab.keys),
        at('Environments', '', ProjectTab.environments),
      ]
    }),
    { path: ['Server', 'System info'], value: version ?? '', link: { to: '/system-info' } },
  ]
}

// Every word of the query has to appear somewhere in the entry, in any order.
export function matchEntries(entries: Entry[], query: string): Entry[] {
  const words = searchWords(query)
  if (!words.length) return []
  return entries.filter((entry) => hasWords(`${entry.path.join(' ')} ${entry.value}`, words))
}
