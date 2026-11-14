import type { IssueFilters, IssueSort } from '@/api/issues'

export const DEFAULT_QUERY = 'is:unresolved'
export const DEFAULT_SORT: IssueSort = '-last_seen'

export const SORTS: { value: IssueSort; label: string }[] = [
  { value: '-last_seen', label: 'last seen' },
  { value: '-first_seen', label: 'first seen' },
  { value: '-count', label: 'most events' },
  { value: 'count', label: 'fewest events' },
  { value: '-priority', label: 'priority' },
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
