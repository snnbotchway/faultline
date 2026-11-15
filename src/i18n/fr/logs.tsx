import type { Messages } from '../en'
import { count as number, plural } from '../format'

export const logs: Messages['logs'] = {
  searchMessages: 'Rechercher dans les messages',
  filters: 'Filtres',
  clearFilters: 'Effacer les filtres',
  logsPerHour: 'Journaux par heure',
  loading: 'Chargement des journaux',
  log: 'Journal',
  logList: 'Journaux',
  fields: 'Champs',
  chartNote: 'Le graphique compte tous les journaux de la période ; la recherche, l’hôte et la trace ne le restreignent pas.',
  loadOlder: 'Charger les journaux plus anciens',
  olderFailed: 'Impossible de charger les journaux plus anciens.',

  logs: (count) => plural(count, { one: '# journal', many: '# de journaux', other: '# journaux' }),
  searchedSpan: (count) =>
    plural(count, { one: 'Recherche faite dans le premier journal de cette trace pour ce span.', other: 'Recherche faite dans les # premiers journaux de cette trace pour ce span.' }),
  searchedSpanFailed: (count) =>
    plural(count, {
      one: 'Recherche faite dans le premier journal de cette trace pour ce span. Impossible de charger le reste.',
      other: 'Recherche faite dans les # premiers journaux de cette trace pour ce span. Impossible de charger le reste.',
    }),

  timeRange: 'Période',
  rangeShort: { '1h': '1 h', '6h': '6 h', '24h': '24 h', '7d': '7 j' },
  ranges: { '1h': 'Dernière heure', '6h': '6 dernières heures', '24h': '24 dernières heures', '7d': '7 derniers jours' },
  noLogsIn: {
    '1h': 'Aucun journal sur la dernière heure',
    '6h': 'Aucun journal sur les 6 dernières heures',
    '24h': 'Aucun journal sur les 24 dernières heures',
    '7d': 'Aucun journal sur les 7 derniers jours',
  },

  errors: {
    denied: 'Vous ne pouvez pas voir les journaux de cette organisation',
    list: 'Impossible de charger les journaux',
    noMatch: 'Aucun journal ne correspond',
    missing: 'Ce journal n’existe plus',
    missingNote: 'Ce journal n’existe plus.',
    openFailed: 'Impossible de charger ce journal',
    openFailedNote: 'Impossible de charger ce journal.',
    retention: 'Il a peut-être été supprimé à la fin de sa durée de conservation.',
  },

  fieldNames: { trace: 'trace', span: 'span', hour: 'heure', level: 'niveau', service: 'service', environment: 'environnement', host: 'hôte', project: 'projet' },
  facets: { level: 'Niveau', service: 'Service', environment: 'Environnement', host: 'Hôte' },
  filtersInForce: 'Filtres actifs',
  removeFilter: (name, value) => `Retirer le filtre ${name} ${value}`,
  hourRange: (from, to) => `de ${from} à ${to}`,

  histogram: {
    bar: (when, count) => `${when}, ${plural(count, { one: '# journal', many: '# de journaux', other: '# journaux' })}`,
    peak: (count) => `pic ${number(count)}/h`,
    none: 'aucun journal',
    now: 'Maintenant',
  },

  detail: {
    inTrace: 'Journaux de cette trace',
    only: (name) => <>Seulement {name}</>,
    copyJson: 'Copier en JSON',
    copyAction: 'copier le journal',
  },
}
