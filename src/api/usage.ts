import { queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'
import type { components } from './schema/openapi'

export const UsageKind = { errors: 'errors', transactions: 'transactions', logs: 'logs', uptime: 'uptime' } as const
export type UsageKind = (typeof UsageKind)[keyof typeof UsageKind]
export const USAGE_KINDS = Object.values(UsageKind)

// The two kinds the backend can count for one project.
export type ProjectKind = typeof UsageKind.errors | typeof UsageKind.transactions
export const isProjectKind = (kind: UsageKind): kind is ProjectKind => kind === UsageKind.errors || kind === UsageKind.transactions

export type UsageCounts = Record<UsageKind, number>
// One day, named in the server's time zone (see `usageDaysQuery`).
export type UsageDay = { date: string; counts: UsageCounts }

// GlitchTip counts ten logs or ten uptime checks as one billed event, and its usage endpoints report the billed
// figure. Mirrors `USAGE_WEIGHTS` (`log_count`, `uptime_check_event_count`) in GlitchTip 7.0.0,
// `apps/organizations_ext/models.py:50`.
const BILLED_PER_ARRIVED = 0.1
// Whole, whatever float the backend sent (`116.80000000000001`).
const arrived = (billed: number) => Math.round(billed / BILLED_PER_ARRIVED)

type BilledCounts = Pick<components['schemas']['DailyEventCountEntry'], 'eventCount' | 'transactionEventCount' | 'logEventCount' | 'uptimeCheckEventCount'>

export const toUsageCounts = (billed: BilledCounts): UsageCounts => ({
  errors: Math.round(billed.eventCount),
  transactions: Math.round(billed.transactionEventCount),
  logs: arrived(billed.logEventCount),
  uptime: arrived(billed.uptimeCheckEventCount),
})

export const totalOf = (counts: UsageCounts) => USAGE_KINDS.reduce((sum, kind) => sum + counts[kind], 0)

const usageKeys = {
  all: (org: string) => ['organizations', org, 'usage'] as const,
  period: (org: string) => [...usageKeys.all(org), 'period'] as const,
  days: (org: string) => [...usageKeys.all(org), 'days'] as const,
  project: (org: string, kind: ProjectKind, id: string) => [...usageKeys.all(org), 'projects', kind, id] as const,
}

const STALE_MS = 60_000

// What an organization took in over the 30 days ending now, the figure stock shows. Without billing the backend's
// period is those 30 days.
export const usagePeriodQuery = (org: string) =>
  queryOptions({
    queryKey: usageKeys.period(org),
    staleTime: STALE_MS,
    queryFn: async () =>
      toUsageCounts(unwrap(await api.GET('/api/0/stripe/subscriptions/{organization_id_or_slug}/events_count/period/', { params: { path: orgPath(org) } }))),
  })

/**
 * The same period a day at a time, for the bars only. GlitchTip 7.0.0 buckets hours into days in the server's time
 * zone but lists UTC dates, so off UTC a day can be missed and the days need not add up to the period
 * (`apps/stripe/api.py:427`).
 */
export const usageDaysQuery = (org: string) =>
  queryOptions({
    queryKey: usageKeys.days(org),
    staleTime: STALE_MS,
    queryFn: async () => {
      const { data } = unwrap(await api.GET('/api/0/stripe/subscriptions/{organization_id_or_slug}/events_count/daily/', { params: { path: orgPath(org) } }))
      return data.map((entry): UsageDay => ({ date: entry.date, counts: toUsageCounts(entry) }))
    },
  })

const HOUR_MS = 3600_000
const USAGE_DAYS = 30
const FIELD = 'sum(quantity)'

// The schema leaves this response untyped. An hour without events comes back as null.
type StatsResponse = { intervals: string[]; groups: { series: Record<string, (number | null)[]> }[] }

// Hourly counts added up into days, keyed like `UsageDay.date`. The backend writes each hour in its own time zone,
// so the date it writes is the day the daily counts put that hour in.
export function countsByDay(intervals: string[], counts: (number | null)[]): Record<string, number> {
  const days: Record<string, number> = {}
  intervals.forEach((interval, index) => {
    const day = interval.slice(0, 10)
    days[day] = (days[day] ?? 0) + (counts[index] ?? 0)
  })
  return days
}

// The hours the usage period covers: the backend counts an hour when it starts inside the 30 days.
export function usageHours(now: number): { start: string; end: string } {
  const end = Math.floor(now / HOUR_MS) * HOUR_MS
  const start = Math.ceil((now - USAGE_DAYS * 24 * HOUR_MS) / HOUR_MS) * HOUR_MS
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() }
}

/** Runs at most `max` of the calls given to it at a time, in the order they came. */
export function inTurns(max: number) {
  let running = 0
  const waiting: (() => void)[] = []
  return async <T>(call: () => Promise<T>): Promise<T> => {
    if (running < max) running++
    else await new Promise<void>((resolve) => waiting.push(resolve))
    try {
      return await call()
    } finally {
      // The slot passes straight to the next call, so a new one cannot jump the queue.
      const next = waiting.shift()
      if (next) next()
      else running--
    }
  }
}

// GlitchTip 7.0.0 answers one `stats_v2` request at a time per worker, so more at once only queue there and hold up
// the rest of the page.
const projectTurns = inTurns(4)

/**
 * One kind's daily counts for one project over the usage period. Hourly, because the backend's daily buckets count
 * only each day's first hour.
 */
export const projectUsageQuery = (org: string, kind: ProjectKind, id: string) =>
  queryOptions({
    queryKey: usageKeys.project(org, kind, id),
    staleTime: STALE_MS,
    // A retry waits its turn behind the other projects; the row offers its own after one.
    retry: 1,
    queryFn: ({ signal }) =>
      projectTurns(async () => {
        signal.throwIfAborted()
        const category = kind === UsageKind.errors ? 'error' : 'transaction'
        const { intervals, groups } = unwrap(
          await api.GET('/api/0/organizations/{organization_id_or_slug}/stats_v2/', {
            params: { path: orgPath(org), query: { category, field: FIELD, interval: '1h', project: [Number(id)], ...usageHours(Date.now()) } },
            signal,
          }),
        ) as unknown as StatsResponse
        return countsByDay(intervals, groups[0]?.series[FIELD] ?? [])
      }),
  })

// The address a paid support license is registered to; empty without one.
export const licenseEmailQuery = queryOptions({
  queryKey: ['instance-license', 'billing-email'],
  queryFn: async () => unwrap(await api.GET('/api/0/instance-license/')).billingEmail,
  staleTime: Infinity,
  retry: false,
})
