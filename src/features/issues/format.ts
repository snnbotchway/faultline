const STEPS: [number, string][] = [
  [60, 's'],
  [60, 'm'],
  [24, 'h'],
  [30, 'd'],
  [Infinity, 'mo'],
]

// `7m`, `3h`, `2d`: how long ago, short enough for a table cell.
export function ago(time: string | Date, now = new Date()): string {
  let value = Math.max(0, (now.getTime() - new Date(time).getTime()) / 1000)
  for (const [size, unit] of STEPS) {
    if (value < size) return `${Math.floor(value)}${unit}`
    value /= size
  }
  return ''
}

// `Nov 14, 12:54 PM`: the moment without the year or seconds, for narrow screens.
const briefFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export const brief = (time: string | Date) => briefFormat.format(new Date(time))

const exactFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
export const exact = (time: string | Date) => exactFormat.format(new Date(time))

const compactFormat = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
export const compact = (count: number | string) => compactFormat.format(Number(count)).toLowerCase()

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const hourFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
export const dayLabel = (seconds: number) => dayFormat.format(new Date(seconds * 1000))
export const hourLabel = (seconds: number) => hourFormat.format(new Date(seconds * 1000))

// How many issues a search matches. The backend stops counting at a limit; `capped` says it was reached.
export type Hits = { n: number; capped: boolean }
export const hitsText = (hits: Hits) => `${hits.n}${hits.capped ? '+' : ''}`

// `1 issue`, `3 issues`. `count` may already be worded (`1000+`).
export const plural = (count: number | string, word: string) => `${count} ${word}${String(count) === '1' ? '' : 's'}`
