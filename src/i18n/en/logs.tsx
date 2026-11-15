import type { ReactNode } from 'react'
import { count as number, plural } from '../format'

// Logs: the list, its filters and chart, and one log's fields.
export const logs = {
  searchMessages: 'Search messages',
  filters: 'Filters',
  clearFilters: 'Clear filters',
  logsPerHour: 'Logs per hour',
  loading: 'Loading logs',
  log: 'Log',
  logList: 'Logs',
  fields: 'Fields',
  chartNote: "The chart counts every log in the window; the search, host and trace don't narrow it.",
  loadOlder: 'Load older logs',
  olderFailed: "Older logs didn't load.",

  // "1 log", "1,204 logs", "1000+ logs"
  logs: (count: number | string) => plural(count, { one: '# log', other: '# logs' }),
  searchedSpan: (count: number) =>
    plural(count, { one: 'Searched the first log of this trace for this span.', other: 'Searched the first # logs of this trace for this span.' }),
  searchedSpanFailed: (count: number) =>
    plural(count, { one: "Searched the first log of this trace for this span. The rest didn't load.", other: "Searched the first # logs of this trace for this span. The rest didn't load." }),

  // "Time range: 24h (Last 24 hours)": the button shows only `24h`, so a phone, which has no hover, still has the words.
  timeRange: 'Time range',
  ranges: { '1h': 'Last hour', '6h': 'Last 6 hours', '24h': 'Last 24 hours', '7d': 'Last 7 days' },
  noLogsIn: { '1h': 'No logs in the last hour', '6h': 'No logs in the last 6 hours', '24h': 'No logs in the last 24 hours', '7d': 'No logs in the last 7 days' },

  errors: {
    denied: "You can't see logs in this organization",
    list: "The logs didn't load",
    noMatch: 'No logs match',
    missing: 'This log no longer exists',
    missingNote: 'This log no longer exists.',
    openFailed: "This log didn't load",
    openFailedNote: "This log didn't load.",
    retention: 'It may have been removed when its retention ran out.',
  },

  // The fixed fields of a log, as the names beside their values.
  fieldNames: { trace: 'trace', span: 'span', hour: 'hour', level: 'level', service: 'service', environment: 'environment', host: 'host', project: 'project' },
  facets: { level: 'Level', service: 'Service', environment: 'Environment', host: 'Host' },
  filtersInForce: 'Filters in force',
  removeFilter: (name: string, value: string) => `Remove ${name} ${value}`,
  hourRange: (from: string, to: string) => `${from} to ${to}`,

  histogram: {
    bar: (when: string, count: number) => `${when}, ${plural(count, { one: '# log', other: '# logs' })}`,
    peak: (count: number) => `peak ${number(count)}/hour`,
    none: 'no logs',
    now: 'Now',
  },

  detail: {
    inTrace: 'Logs in this trace',
    only: (name: ReactNode) => <>Only {name}</>,
    copyJson: 'Copy as JSON',
    copyAction: 'copy the log',
  },
}
