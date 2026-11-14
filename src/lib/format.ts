// How many items match. The backend stops counting at a limit; `capped` says it was reached.
export type Hits = { n: number; capped: boolean }
export const hitsText = (hits: Hits) => `${hits.n}${hits.capped ? '+' : ''}`

// `1 issue`, `3 issues`. `count` may already be worded (`1000+`).
export const plural = (count: number | string, word: string) => `${count} ${word}${String(count) === '1' ? '' : 's'}`
