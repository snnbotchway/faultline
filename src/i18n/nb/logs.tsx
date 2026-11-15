import type { Messages } from '../en'
import { count as number, plural } from '../format'

export const logs: Messages['logs'] = {
  searchMessages: 'Søk i meldinger',
  filters: 'Filtre',
  clearFilters: 'Fjern filtre',
  logsPerHour: 'Logger per time',
  loading: 'Laster logger',
  log: 'Logg',
  logList: 'Logger',
  fields: 'Felt',
  chartNote: 'Diagrammet teller alle loggene i perioden. Søk, vert og trace snevrer det ikke inn.',
  loadOlder: 'Last inn eldre logger',
  olderFailed: 'Eldre logger lastet ikke.',

  logs: (count) => plural(count, { one: '# logg', other: '# logger' }),
  searchedSpan: (count) =>
    plural(count, { one: 'Søkte i den første loggen i denne tracen for dette spanet.', other: 'Søkte i de første # loggene i denne tracen for dette spanet.' }),
  searchedSpanFailed: (count) =>
    plural(count, {
      one: 'Søkte i den første loggen i denne tracen for dette spanet. Resten lastet ikke.',
      other: 'Søkte i de første # loggene i denne tracen for dette spanet. Resten lastet ikke.',
    }),

  timeRange: 'Tidsrom',
  ranges: { '1h': 'Siste time', '6h': 'Siste 6 timer', '24h': 'Siste 24 timer', '7d': 'Siste 7 dager' },
  noLogsIn: {
    '1h': 'Ingen logger den siste timen',
    '6h': 'Ingen logger de siste 6 timene',
    '24h': 'Ingen logger de siste 24 timene',
    '7d': 'Ingen logger de siste 7 dagene',
  },

  errors: {
    denied: 'Du kan ikke se logger i denne organisasjonen',
    list: 'Loggene lastet ikke',
    noMatch: 'Ingen logger samsvarer',
    missing: 'Denne loggen finnes ikke lenger',
    missingNote: 'Denne loggen finnes ikke lenger.',
    openFailed: 'Denne loggen lastet ikke',
    openFailedNote: 'Denne loggen lastet ikke.',
    retention: 'Den kan ha blitt fjernet da oppbevaringstiden gikk ut.',
  },

  fieldNames: { trace: 'trace', span: 'span', hour: 'time', level: 'nivå', service: 'tjeneste', environment: 'miljø', host: 'vert', project: 'prosjekt' },
  facets: { level: 'Nivå', service: 'Tjeneste', environment: 'Miljø', host: 'Vert' },
  filtersInForce: 'Aktive filtre',
  removeFilter: (name, value) => `Fjern filteret ${name} ${value}`,
  hourRange: (from, to) => `${from} til ${to}`,

  histogram: {
    bar: (when, count) => `${when}, ${plural(count, { one: '# logg', other: '# logger' })}`,
    peak: (count) => `topp ${number(count)}/time`,
    none: 'ingen logger',
    now: 'Nå',
  },

  detail: {
    inTrace: 'Logger i denne tracen',
    only: (name) => <>Bare {name}</>,
    copyJson: 'Kopier som JSON',
    copyAction: 'kopiere loggen',
  },
}
