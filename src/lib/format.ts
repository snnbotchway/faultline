// How many items match. The backend stops counting at a limit; `capped` says it was reached.
export type Hits = { n: number; capped: boolean }
export const hitsText = (hits: Hits) => `${hits.n}${hits.capped ? '+' : ''}`

// `1 issue`, `3 issues`. `count` may already be worded (`1000+`).
export const plural = (count: number | string, word: string) => `${count} ${word}${String(count) === '1' ? '' : 's'}`

// A count that may not be known: still loading, not available (shown as a dash), or counted.
export const CountState = { loading: 'loading', unavailable: 'unavailable', counted: 'counted' } as const
export type CountState = (typeof CountState)[keyof typeof CountState]
export type Count = { state: typeof CountState.loading } | { state: typeof CountState.unavailable } | { state: typeof CountState.counted; hits: Hits }

export const LOADING: Count = { state: CountState.loading }
export const UNAVAILABLE: Count = { state: CountState.unavailable }
export const counted = (hits: Hits | undefined): Count => (hits ? { state: CountState.counted, hits } : LOADING)
