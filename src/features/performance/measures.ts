import type { NPlusOnePattern, SpanGroup, TransactionGroup, TrendDay } from '@/api/performance'
import type { Axis, Mark } from '@/features/issues/trend'
import { DAY } from '@/lib/time'

export const WEEK = 7

// Seven daily buckets ending today, on the backend's (UTC) day boundaries.
export function weekAxis(now: Date): Axis {
  const today = Math.floor(now.getTime() / 1000 / DAY) * DAY
  return { start: today - (WEEK - 1) * DAY, size: DAY, count: WEEK }
}

const utc = (date: string) => Date.parse(/Z|[+-]\d\d:?\d\d$/.test(date) ? date : `${date}Z`)

// Time spent in spans per request, for each day of the axis. The backend counts a request once per span
// group it touched, so its daily request count is too high by the number of span groups; `spanGroups`
// undoes that. Without it the values are only good for comparing one day with another. The trend has
// no count per span group, so a day on which a request starts touching a new span group counts more
// requests than ran, and its time per request reads low: a regression that adds a query looks smaller
// than it is.
export function spanTimePerRequest(trend: TrendDay[] | undefined, axis: Axis, spanGroups = 1): number[] {
  const time = Array.from({ length: axis.count }, () => 0)
  for (const day of trend ?? []) {
    const index = Math.floor((utc(day.date) / 1000 - axis.start) / axis.size)
    if (index < 0 || index >= axis.count || day.transactionCount <= 0) continue
    time[index] = day.totalTime / (day.transactionCount / spanGroups)
  }
  return time
}

const SLOWER_FACTOR = 1.5
const RECENT_DAYS = 2
const MIN_EARLIER_DAYS = 2
const ONSET_FACTOR = 1.25

export type Regression = { factor: number; since: number }

// Slower: the last two days with requests average well above the days before them. `since` is the
// index of the day the rise began: the first of the latest days that all stay above the earlier level.
export function regression(time: number[]): Regression | undefined {
  const days = time.map((value, index) => ({ value, index })).filter((day) => day.value > 0)
  const recent = days.slice(-RECENT_DAYS)
  const before = days.slice(0, -RECENT_DAYS)
  if (before.length < MIN_EARLIER_DAYS || recent.length < RECENT_DAYS) return undefined
  const mean = (list: typeof days) => list.reduce((sum, day) => sum + day.value, 0) / list.length
  const base = mean(before)
  const factor = mean(recent) / base
  if (factor < SLOWER_FACTOR) return undefined
  let onset = days.length - RECENT_DAYS
  while (onset > 0 && days[onset - 1]!.value > base * ONSET_FACTOR) onset--
  return { factor, since: days[onset]!.index }
}

// The release a regression started with, if one went out around that day.
export function releaseAt(marks: Mark[], axis: Axis, dayIndex: number): string | undefined {
  const from = (dayIndex - 0.5) / axis.count
  const to = (dayIndex + 1) / axis.count
  return marks.findLast((mark) => mark.at >= from && mark.at < to)?.version
}

export type SpanRow = SpanGroup & { times: number; time: number; repeats: boolean }

// The backend calls a span repeated when it runs more than this many times per request.
const REPEAT_THRESHOLD = 5

// What an average request spends in each span group over the last week, largest first. `total` is the
// whole request: the group's average, or the time in spans when that is longer.
export function averageRequest(group: Pick<TransactionGroup, 'count' | 'avgDuration'>, spans: SpanGroup[], trend: TrendDay[]) {
  const counted = trend.reduce((sum, day) => sum + day.transactionCount, 0) / Math.max(1, spans.length)
  const requests = counted > 0 ? counted : group.count
  const rows: SpanRow[] = spans
    .map((span) => {
      const times = span.count / requests
      return { ...span, times, time: span.totalTime / requests, repeats: times > REPEAT_THRESHOLD }
    })
    .sort((a, b) => b.time - a.time)
  const inSpans = rows.reduce((sum, row) => sum + row.time, 0)
  const total = Math.max(group.avgDuration, inSpans)
  return { rows, total, outside: total - inSpans }
}

// How much of one request a repeated query takes, from 0 to 1, and how long that request is: the
// transaction's average, or the query's own time when that is longer. Unknown without the average.
export function shareOfRequest(pattern: Pick<NPlusOnePattern, 'spansPerTxn' | 'avgDuration'>, average: number | undefined): { perRequest: number; request?: number; share?: number } {
  const perRequest = pattern.spansPerTxn * pattern.avgDuration
  if (average === undefined) return { perRequest }
  const request = Math.max(average, perRequest)
  return { perRequest, request, share: request > 0 ? perRequest / request : 0 }
}

// A short, stable name for a repeated query, for the URL.
export function patternKey(pattern: Pick<NPlusOnePattern, 'transactionName' | 'description'>): string {
  let hash = 5381
  for (const char of `${pattern.transactionName}\n${pattern.description}`) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0
  return hash.toString(36)
}

// The first part of a span's kind: `db` for `db.query`, `http` for `http.client`.
export const kindOf = (op: string) => op.split('.')[0] ?? op
