import type { Messages } from '../en'
import { plural } from '../format'

export const projects: Messages['projects'] = {
  title: 'Prosjekter',
  noOrganization: 'Ingen organisasjon ennå',
  createOrganization: 'Opprett en organisasjon',
  askOwner: 'Be en eier invitere deg til sin.',
  find: 'Finn et prosjekt',
  noProjects: 'Ingen prosjekter ennå',
  newProject: 'Nytt prosjekt',
  noMatch: (query) => `Ingen prosjekter samsvarer med «${query}».`,
  columns: {
    open: 'Åpne',
    project: 'Prosjekt',
    errors: (days) => `Feil, siste ${days} dager`,
    lastSeen: 'Sist sett',
    alerts: 'Varsler',
  },
  setUp: (slug) => `Sett opp ${slug}`,
  issuesIn: (slug) => `Problemer i ${slug}`,
  settingsOf: (slug) => `Innstillinger for ${slug}`,
  noEventsYet: 'Ingen hendelser ennå',
  alertCount: (count) => plural(count, { one: '# varsel', other: '# varsler' }),
}
