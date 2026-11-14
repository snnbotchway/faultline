import type { IssueFilters, IssueSort } from '@/api/issues'
import { plural } from '@/lib/text'
import { StatusView, isStatus } from './status'

export const DEFAULT_QUERY = 'is:unresolved'
export const DEFAULT_SORT: IssueSort = '-last_seen'

// Every sort the API takes, so a link from the stock UI keeps its order.
export const SORTS: { value: IssueSort; label: string }[] = [
  { value: '-last_seen', label: 'Last seen' },
  { value: 'last_seen', label: 'Least recently seen' },
  { value: '-first_seen', label: 'Newest' },
  { value: 'first_seen', label: 'Oldest' },
  { value: '-count', label: 'Most events' },
  { value: 'count', label: 'Fewest events' },
  { value: '-priority', label: 'Highest priority' },
  { value: 'priority', label: 'Lowest priority' },
]

// URL state of the inbox. Same names as the stock GlitchTip UI, so its links keep working.
export type InboxSearch = {
  query?: string
  sort?: IssueSort
  project?: number[]
  environment?: string
  start?: string
  end?: string
}

const numbers = (value: unknown) =>
  (Array.isArray(value) ? value : value === undefined || value === '' ? [] : [value]).map(Number).filter(Number.isInteger)

// A time the backend takes: relative to now (`now-7d`, `now-1h`, `now-30m`) or an absolute date.
const RELATIVE = /^now-(\d+)([mhd])$/
const UNIT = { m: { word: 'minute', perDay: 1440 }, h: { word: 'hour', perDay: 24 }, d: { word: 'day', perDay: 1 } } as const
const date = (value: unknown) => (typeof value === 'string' && (RELATIVE.test(value) || !Number.isNaN(Date.parse(value))) ? value : undefined)

export function validateInboxSearch(search: Record<string, unknown>): InboxSearch {
  const project = numbers(search.project)
  const sort = SORTS.find((s) => s.value === search.sort)?.value
  return {
    query: typeof search.query === 'string' ? search.query : undefined,
    sort: sort === DEFAULT_SORT ? undefined : sort,
    project: project.length > 0 ? project : undefined,
    environment: typeof search.environment === 'string' && search.environment ? search.environment : undefined,
    start: date(search.start),
    end: date(search.end),
  }
}

// An absent query means the default; an empty one means every issue.
export function toFilters(search: InboxSearch): IssueFilters {
  return {
    query: search.query ?? DEFAULT_QUERY,
    sort: search.sort ?? DEFAULT_SORT,
    project: search.project,
    environment: search.environment ? [search.environment] : undefined,
    start: search.start,
    end: search.end,
  }
}

// The choices of the time menu, each as the `start` the backend takes.
export const TIME_RANGES = [
  { start: 'now-1h', label: 'Last hour' },
  { start: 'now-1d', label: 'Last 24 hours' },
  { start: 'now-7d', label: 'Last 7 days' },
  { start: 'now-14d', label: 'Last 14 days' },
  { start: 'now-30d', label: 'Last 30 days' },
]

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// The range in words. `start` is set when it is one of the choices; other ranges are shown as they are.
export function timeRange(search: Pick<InboxSearch, 'start' | 'end'>): { start?: string; label: string } {
  if (!search.start && !search.end) return { label: 'Any time' }
  const relative = !search.end && search.start?.match(RELATIVE)
  if (relative) {
    const count = Number(relative[1])
    const unit = UNIT[relative[2] as keyof typeof UNIT]
    const preset = TIME_RANGES.find((range) => range.start === search.start)
    return preset ?? TIME_RANGES.find((range) => range.start === `now-${count / unit.perDay}d`) ?? { label: `Last ${plural(count, unit.word)}` }
  }
  const words = (value: string | undefined, missing: string) => (!value ? missing : RELATIVE.test(value) ? value : dateTimeFormat.format(new Date(value)))
  return { label: `${words(search.start, 'Start')} – ${words(search.end, 'now')}` }
}

// A `datetime-local` field holds the viewer's wall-clock time; the backend takes UTC with a `Z`.
export const localToUtc = (local: string) => new Date(local).toISOString().replace(/\.000Z$/, 'Z')

const two = (value: number) => String(value).padStart(2, '0')
export function utcToLocal(time: string) {
  const at = new Date(time)
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}T${two(at.getHours())}:${two(at.getMinutes())}`
}

// Whether the inbox shows anything other than its default view.
export const isFiltered = (search: InboxSearch) =>
  (search.query ?? DEFAULT_QUERY) !== DEFAULT_QUERY || !!search.project?.length || !!search.environment || !!search.start || !!search.end

// The backend reads `key:value` filters only up to the first bare word; everything after
// that is free text. So filters are always written ahead of the text.
const TOKEN = /(?:[^\s"]+|"[^"]*")+/g
const isFilter = (token: string) => /^[\w.-]+:./.test(token)

function split(query: string) {
  const tokens = query.match(TOKEN) ?? []
  const firstWord = tokens.findIndex((token) => !isFilter(token))
  const end = firstWord === -1 ? tokens.length : firstWord
  return { filters: tokens.slice(0, end), text: tokens.slice(end) }
}

const join = (filters: string[], text: string[]) => [...filters, ...text].join(' ')

export function statusOf(query: string): StatusView {
  const value = split(query)
    .filters.find((filter) => filter.startsWith('is:'))
    ?.slice(3)
  return value !== undefined && isStatus(value) ? value : StatusView.all
}

export function withStatus(query: string, view: StatusView) {
  const { filters, text } = split(query)
  const rest = filters.filter((filter) => !filter.startsWith('is:'))
  return join(view === StatusView.all ? rest : [`is:${view}`, ...rest], text)
}

export function withFilter(query: string, key: string, value: string) {
  const { filters, text } = split(query)
  const filter = `${key}:${/[\s"]/.test(value) ? `"${value.replaceAll('"', '')}"` : value}`
  return filters.includes(filter) ? query : join([...filters, filter], text)
}
