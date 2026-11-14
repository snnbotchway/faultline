import { LogLevel, type LogEvent } from '@/api/logs'
import { projectIds, searchText as text } from '@/lib/search'
import { HOUR } from '@/lib/time'

export const RANGES = [
  { value: '1h', label: 'Last hour', hours: 1 },
  { value: '6h', label: 'Last 6 hours', hours: 6 },
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 168 },
] as const
export type Range = (typeof RANGES)[number]['value']
const DEFAULT_RANGE: Range = '24h'

// Most severe first.
export const LEVELS: LogLevel[] = [LogLevel.fatal, LogLevel.error, LogLevel.warn, LogLevel.info, LogLevel.debug, LogLevel.trace]
const isLevel = (value: unknown): value is LogLevel => LEVELS.some((level) => level === value)
// A log's level as the backend sent it; one this app does not know is drawn as debug, as issues are.
export const levelOf = (log: Pick<LogEvent, 'level'>): LogLevel => (isLevel(log.level) ? log.level : LogLevel.debug)

export type LogSearch = {
  query?: string
  level?: LogLevel[]
  service?: string
  environment?: string
  host?: string
  project?: number[]
  traceId?: string
  // One span of the trace. The backend cannot filter by it, so the trace's logs are narrowed in the browser.
  spanId?: string
  range?: Range
  // One hour picked on the chart, as the second it starts at.
  hour?: number
  // The open log.
  log?: string
}

const integer = (value: unknown) => (value !== undefined && Number.isInteger(Number(value)) ? Number(value) : undefined)

// Changes the search in the URL.
export type SetSearch = (patch: Partial<LogSearch>) => void

export function validateLogSearch(search: Record<string, unknown>): LogSearch {
  const level = (Array.isArray(search.level) ? search.level : search.level === undefined ? [] : [search.level]).filter(isLevel)
  const traceId = text(search.traceId)
  return {
    query: text(search.query),
    level: level.length > 0 ? level : undefined,
    service: text(search.service),
    environment: text(search.environment),
    host: text(search.host),
    project: projectIds(search.project),
    traceId,
    spanId: traceId ? text(search.spanId) : undefined,
    range: RANGES.find((range) => range.value === search.range && range.value !== DEFAULT_RANGE)?.value,
    hour: integer(search.hour),
    log: text(search.log),
  }
}

export const rangeOf = (search: LogSearch) => RANGES.find((range) => range.value === (search.range ?? DEFAULT_RANGE))!
export const hourEnd = (hour: number) => hour + HOUR

export function toggleLevel(search: LogSearch, level: LogLevel): LogLevel[] | undefined {
  const next = search.level?.includes(level) ? search.level.filter((item) => item !== level) : [...(search.level ?? []), level]
  return next.length > 0 ? LEVELS.filter((item) => next.includes(item)) : undefined
}

// Everything that narrows the list, cleared together.
export const NO_FILTERS = {
  query: undefined,
  level: undefined,
  service: undefined,
  environment: undefined,
  host: undefined,
  project: undefined,
  traceId: undefined,
  spanId: undefined,
  hour: undefined,
  log: undefined,
} satisfies Partial<LogSearch>

// How many of the filters behind the phone's Filters button are set.
export const facetCount = (search: LogSearch) => (search.level?.length ?? 0) + [search.service, search.environment, search.host, search.project].filter((value) => value !== undefined).length

export const isNarrowed = (search: LogSearch) => facetCount(search) > 0 || !!search.query || !!search.traceId || search.hour !== undefined
