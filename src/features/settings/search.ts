import type { LinkProps } from '@tanstack/react-router'
import type { Member } from '@/api/members'
import type { Organization } from '@/api/organizations'
import type { Project } from '@/api/projects'
import type { Team } from '@/api/teams'
import { platformName } from './platforms'
import { ProjectTab } from './project-tabs'
import { ROLE_LABEL } from './roles'

// One thing the settings search can land on: where it sits, what it is set to, and the page that changes it.
export type Entry = { path: string[]; value: string; link: LinkProps }

const teamText = (teams: { slug: string }[]) => teams.map((team) => `#${team.slug}`).join(' ')

export function settingsEntries({
  organization,
  members,
  teams,
  projects,
  version,
}: {
  organization: Pick<Organization, 'slug' | 'name'>
  members: Member[]
  teams: Team[]
  projects: Project[]
  version?: string
}): Entry[] {
  const org = organization.slug
  return [
    { path: [org, 'Name'], value: organization.name, link: { to: '/$org/settings', params: { org } } },
    { path: [org, 'Delete organization'], value: '', link: { to: '/$org/settings', params: { org } } },
    { path: ['Members', 'Invite members'], value: '', link: { to: '/$org/settings/members/new', params: { org } } },
    ...members.map((member) => ({
      path: ['Members', member.user?.name || member.email],
      value: `${member.email} · ${member.pending ? 'Invited' : ROLE_LABEL[member.role]}`,
      link: { to: '/$org/settings/members/$memberId', params: { org, memberId: member.id } } as LinkProps,
    })),
    ...teams.map((team) => ({
      path: ['Teams', `#${team.slug}`],
      value: `${team.memberCount} ${team.memberCount === 1 ? 'member' : 'members'}`,
      link: { to: '/$org/settings/teams/$team/$tab', params: { org, team: team.slug, tab: 'members' } } as LinkProps,
    })),
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
        at('Teams with access', teamText(project.teams), ProjectTab.general),
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
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return entries.filter((entry) => {
    const text = `${entry.path.join(' ')} ${entry.value}`.toLowerCase()
    return words.every((word) => text.includes(word))
  })
}
