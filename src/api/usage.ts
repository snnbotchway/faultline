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
// One UTC day, as the backend buckets them.
export type UsageDay = { date: string; counts: UsageCounts }

// GlitchTip counts ten logs or ten uptime checks as one billed event, and its usage endpoints report the billed
// figure. Mirrors `USAGE_WEIGHTS` (`log_count`, `uptime_check_event_count`) in GlitchTip 7.0.0,
// `apps/organizations_ext/models.py:50`.
const BILLED_PER_ARRIVED = 0.1
// The number that arrived, from the billed figure. Whole, whatever float the backend sent (`116.80000000000001`).
const arrived = (billed: number) => Math.round(billed / BILLED_PER_ARRIVED)

type DailyEntry = components['schemas']['DailyEventCountEntry']

// The backend's days as counts of what arrived, oldest first.
export const toUsageDays = (entries: DailyEntry[]): UsageDay[] =>
  entries.map((entry) => ({
    date: entry.date,
    counts: {
      errors: Math.round(entry.eventCount),
      transactions: Math.round(entry.transactionEventCount),
      logs: arrived(entry.logEventCount),
      uptime: arrived(entry.uptimeCheckEventCount),
    },
  }))

export const totalOf = (counts: UsageCounts) => USAGE_KINDS.reduce((sum, kind) => sum + counts[kind], 0)

export const sumDays = (days: UsageDay[]): UsageCounts => {
  const sum: UsageCounts = { errors: 0, transactions: 0, logs: 0, uptime: 0 }
  for (const day of days) for (const kind of USAGE_KINDS) sum[kind] += day.counts[kind]
  return sum
}

const usageKeys = {
  all: (org: string) => ['organizations', org, 'usage'] as const,
  days: (org: string) => [...usageKeys.all(org), 'days'] as const,
  projects: (org: string, kind: ProjectKind, ids: string[]) => [...usageKeys.all(org), 'projects', kind, ids] as const,
}

const STALE_MS = 60_000

// What an organization took in over the 30 days ending now, a day at a time. Without billing the backend's period
// is those 30 days; the first day is the part of it they cover.
export const usageDaysQuery = (org: string) =>
  queryOptions({
    queryKey: usageKeys.days(org),
    staleTime: STALE_MS,
    queryFn: async () =>
      toUsageDays(unwrap(await api.GET('/api/0/stripe/subscriptions/{organization_id_or_slug}/events_count/daily/', { params: { path: orgPath(org) } })).data),
  })

const HOUR_MS = 3600_000
const USAGE_DAYS = 30
const FIELD = 'sum(quantity)'

// The schema leaves this response untyped. An hour without events comes back as null.
type StatsResponse = { intervals: string[]; groups: { series: Record<string, (number | null)[]> }[] }

// Hourly counts added up into UTC days, keyed like `UsageDay.date`.
export function countsByDay(intervals: string[], counts: (number | null)[]): Record<string, number> {
  const days: Record<string, number> = {}
  intervals.forEach((interval, index) => {
    const day = new Date(interval).toISOString().slice(0, 10)
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

/**
 * One kind's daily counts for each project, by project id, over the usage period. One request a project, so it is
 * asked for only when a kind is unfolded. Hourly, because the backend's daily buckets count only each day's first hour.
 */
export const projectUsageQuery = (org: string, kind: ProjectKind, ids: string[]) =>
  queryOptions({
    queryKey: usageKeys.projects(org, kind, ids),
    staleTime: STALE_MS,
    queryFn: async (): Promise<Record<string, Record<string, number>>> => {
      const hours = usageHours(Date.now())
      const category = kind === UsageKind.errors ? 'error' : 'transaction'
      const rows = await Promise.all(
        ids.map(async (id) => {
          const { intervals, groups } = unwrap(
            await api.GET('/api/0/organizations/{organization_id_or_slug}/stats_v2/', {
              params: { path: orgPath(org), query: { category, field: FIELD, interval: '1h', project: [Number(id)], ...hours } },
            }),
          ) as unknown as StatsResponse
          return [id, countsByDay(intervals, groups[0]?.series[FIELD] ?? [])] as const
        }),
      )
      return Object.fromEntries(rows)
    },
  })

// The address a paid support license is registered to; empty without one.
export const licenseEmailQuery = queryOptions({
  queryKey: ['instance-license', 'billing-email'],
  queryFn: async () => unwrap(await api.GET('/api/0/instance-license/')).billingEmail,
  staleTime: Infinity,
  retry: false,
})
