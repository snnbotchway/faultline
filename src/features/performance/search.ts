import type { TransactionSort } from '@/api/performance'
import { projectIds, searchId, searchText as text } from '@/lib/search'

export const View = { all: 'all', repeated: 'repeated', slower: 'slower', failing: 'failing' } as const
export type View = (typeof View)[keyof typeof View]

// How the list of transactions can be ordered, named in the catalog. Time spent is ranked in the browser; the rest are the backend's sorts.
export const SORTS = ['-avg_duration', 'avg_duration', '-count', 'count', '-created'] as const satisfies readonly TransactionSort[]

export const RepeatOrder = { share: 'share', total: 'total' } as const
export type RepeatOrder = (typeof RepeatOrder)[keyof typeof RepeatOrder]

export const REPEAT_ORDERS = [RepeatOrder.share, RepeatOrder.total] as const

export type PerformanceSearch = {
  view?: View
  query?: string
  // Not `sort`: the inbox has a `sort` of its own, and the router types every route's search together.
  order?: TransactionSort | RepeatOrder
  project?: number[]
  // The transaction open beside the list.
  group?: number
  // The repeated query open beside the list.
  pattern?: string
}

// `sort` is what the stock UI calls `order`, so its links keep their sorting.
export function validatePerformanceSearch(search: Record<string, unknown>): PerformanceSearch {
  const order = search.order ?? search.sort
  return {
    view: Object.values(View).find((view) => view === search.view && view !== View.all),
    query: text(search.query),
    order: SORTS.find((sort) => sort === order) ?? REPEAT_ORDERS.find((item) => item === order),
    project: projectIds(search.project),
    group: searchId(search.group),
    pattern: text(search.pattern),
  }
}

export const transactionSort = (search: PerformanceSearch) => SORTS.find((sort) => sort === search.order)
export const repeatOrder = (search: PerformanceSearch) => REPEAT_ORDERS.find((item) => item === search.order)
