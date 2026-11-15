import { plural } from '../format'

// The projects list, on the home page and under an organization.
export const projects = {
  title: 'Projects',
  noOrganization: 'No organization yet',
  createOrganization: 'Create an organization',
  askOwner: 'Ask an owner to invite you to theirs.',
  find: 'Find a project',
  noProjects: 'No projects yet',
  newProject: 'New project',
  noMatch: (query: string) => `No project matches “${query}”.`,
  columns: {
    open: 'Open',
    project: 'Project',
    errors: (days: number) => `Errors, last ${days} days`,
    lastSeen: 'Last seen',
    alerts: 'Alerts',
  },
  setUp: (slug: string) => `Set up ${slug}`,
  issuesIn: (slug: string) => `Issues in ${slug}`,
  settingsOf: (slug: string) => `Settings of ${slug}`,
  noEventsYet: 'No events yet',
  alertCount: (count: number) => plural(count, { one: '# alert', other: '# alerts' }),
}
