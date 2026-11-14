import type { Member } from '@/api/members'
import type { Project } from '@/api/projects'

export const memberName = (member: Pick<Member, 'user' | 'email'>) => member.user?.name || member.email

// A team as it is written everywhere: `#backend`.
export const teamLabel = (slug: string) => `#${slug}`
export const teamList = (slugs: string[]) => slugs.map(teamLabel).join(' ')

export const projectHasTeam = (project: Pick<Project, 'teams'>, team: string) => project.teams.some((t) => t.slug === team)
