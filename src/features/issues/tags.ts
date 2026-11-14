import type { components } from '@/api/schema/openapi'

type Tag = components['schemas']['IssueTagSchema']

// Values past these are summed into one "other" bar.
export const TOP_VALUES = 10

export const isUrl = (value: string) => /^https?:\/\//i.test(value)

export type Facets = {
  rows: { value: string; name: string; count: number; share: number }[]
  // The share of events with a value that is not in `rows`; 0 when every value is shown.
  other: number
  // A tag with a single value has nothing to compare, so it is drawn without a bar.
  flat: boolean
}

export function tagFacets(tag: Pick<Tag, 'topValues' | 'totalValues' | 'uniqueValues'>): Facets {
  const total = Math.max(1, tag.totalValues)
  const top = [...tag.topValues].sort((a, b) => b.count - a.count).slice(0, TOP_VALUES)
  const shown = top.reduce((sum, item) => sum + item.count, 0)
  return {
    rows: top.map((item) => ({ value: item.value, name: item.name || item.value, count: item.count, share: item.count / total })),
    other: Math.max(0, total - shown) / total,
    flat: tag.uniqueValues <= 1,
  }
}
