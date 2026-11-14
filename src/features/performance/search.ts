import type { TransactionSort } from '@/api/performance'
import { projectIds, searchText as text } from '@/lib/search'

export const View = { all: 'all', repeated: 'repeated', slower: 'slower', failing: 'failing' } as const
export type View = (typeof View)[keyof typeof View]

// How the list of transactions can be ordered. Time spent is ranked in the browser; the rest are the backend's sorts.
export const SORTS: { value: TransactionSort; label: string }[] = [
  { value: '-avg_duration', label: 'Slowest' },
  { value: 'avg_duration', label: 'Fastest' },
  { value: '-count', label: 'Most requests' },
  { value: 'count', label: 'Fewest requests' },
  { value: '-created', label: 'Newest' },
]

export const RepeatOrder = { share: 'share', total: 'total' } as const
export type RepeatOrder = (typeof RepeatOrder)[keyof typeof RepeatOrder]

export const REPEAT_ORDERS: { value: RepeatOrder; label: string }[] = [
  { value: RepeatOrder.share, label: 'Largest share of request' },
  { value: RepeatOrder.total, label: 'Most time spent' },
]

export type PerformanceSearch = {
  view?: View
  query?: string
  // Not `sort`: the inbox has a `sort` of its own, and the router types every route's search together.
  order?: TransactionSort | RepeatOrder
  project?: number[]
  // The transaction open beside the list.
  group?: string
  // The repeated query open beside the list.
  pattern?: string
}

// `sort` is what the stock UI calls `order`, so its links keep their sorting.
export function validatePerformanceSearch(search: Record<string, unknown>): PerformanceSearch {
  const order = search.order ?? search.sort
  return {
    view: Object.values(View).find((view) => view === search.view && view !== View.all),
    query: text(search.query),
    order: SORTS.find((sort) => sort.value === order)?.value ?? REPEAT_ORDERS.find((item) => item.value === order)?.value,
    project: projectIds(search.project),
    group: text(search.group),
    pattern: text(search.pattern),
  }
}

export const transactionSort = (search: PerformanceSearch) => SORTS.find((sort) => sort.value === search.order)?.value
export const repeatOrder = (search: PerformanceSearch) => REPEAT_ORDERS.find((item) => item.value === search.order)?.value
