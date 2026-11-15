import type { Messages } from '../en'
import { plural } from '../format'

export const projects: Messages['projects'] = {
  title: 'Projets',
  noOrganization: 'Aucune organisation pour l’instant',
  createOrganization: 'Créer une organisation',
  askOwner: 'Demandez à un propriétaire de vous inviter dans la sienne.',
  find: 'Chercher un projet',
  noProjects: 'Aucun projet pour l’instant',
  newProject: 'Nouveau projet',
  noMatch: (query) => `Aucun projet ne correspond à « ${query} ».`,
  columns: {
    open: 'Ouverts',
    errors: (days) => `Erreurs, ${days} derniers jours`,
    lastSeen: 'Vu en dernier',
    alerts: 'Alertes',
  },
  setUp: (slug) => `Configurer ${slug}`,
  issuesIn: (slug) => `Problèmes de ${slug}`,
  settingsOf: (slug) => `Paramètres de ${slug}`,
  noEventsYet: 'Aucun événement pour l’instant',
  alertCount: (count) => plural(count, { one: '# alerte', many: '# d’alertes', other: '# alertes' }),
}
