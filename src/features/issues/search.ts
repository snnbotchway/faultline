import type { IssueFilters, IssueSort, IssueStatus } from '@/api/issues'

export const DEFAULT_QUERY = 'is:unresolved'
export const DEFAULT_SORT: IssueSort = '-last_seen'

export const SORTS: { value: IssueSort; label: string }[] = [
  { value: '-last_seen', label: 'Last seen' },
  { value: '-first_seen', label: 'First seen' },
  { value: '-count', label: 'Most events' },
  { value: 'count', label: 'Fewest events' },
  { value: '-priority', label: 'Priority' },
]

// URL state of the inbox. Same names as the stock GlitchTip UI, so its links keep working.
export type InboxSearch = {
  query?: string
  sort?: IssueSort
  project?: number[]
  environment?: string
}

const numbers = (value: unknown) =>
  (Array.isArray(value) ? value : value === undefined || value === '' ? [] : [value]).map(Number).filter(Number.isInteger)

export function validateInboxSearch(search: Record<string, unknown>): InboxSearch {
  const project = numbers(search.project)
  const sort = SORTS.find((s) => s.value === search.sort)?.value
  return {
    query: typeof search.query === 'string' ? search.query : undefined,
    sort: sort === DEFAULT_SORT ? undefined : sort,
    project: project.length > 0 ? project : undefined,
    environment: typeof search.environment === 'string' && search.environment ? search.environment : undefined,
  }
}

// An absent query means the default; an empty one means every issue.
export function toFilters(search: InboxSearch): IssueFilters {
  return {
    query: search.query ?? DEFAULT_QUERY,
    sort: search.sort ?? DEFAULT_SORT,
    project: search.project,
    environment: search.environment ? [search.environment] : undefined,
  }
}

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

export function statusOf(query: string): IssueStatus | undefined {
  const token = split(query).filters.find((filter) => filter.startsWith('is:'))
  return token?.slice(3) as IssueStatus | undefined
}

export function withStatus(query: string, status: IssueStatus | undefined) {
  const { filters, text } = split(query)
  const rest = filters.filter((filter) => !filter.startsWith('is:'))
  return join(status ? [`is:${status}`, ...rest] : rest, text)
}

export function withFilter(query: string, key: string, value: string) {
  const { filters, text } = split(query)
  const filter = `${key}:${/[\s"]/.test(value) ? `"${value.replaceAll('"', '')}"` : value}`
  return filters.includes(filter) ? query : join([...filters, filter], text)
}
