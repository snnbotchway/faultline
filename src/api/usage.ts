import { queryOptions } from '@tanstack/react-query'
import { api, orgPath, unwrap } from './client'

export const UsageCategory = { errors: 'errors', transactions: 'transactions', logs: 'logs', uptime: 'uptime' } as const
export type UsageCategory = (typeof UsageCategory)[keyof typeof UsageCategory]
export const USAGE_CATEGORIES = Object.values(UsageCategory)

export type UsageCounts = Record<UsageCategory, number>
export type UsageDay = { date: string; counts: UsageCounts }

// GlitchTip counts ten logs or ten uptime checks as one billed event, and its usage endpoints report the billed
// figure. Mirrors `USAGE_WEIGHTS` (`log_count` and `uptime_check_event_count`) in GlitchTip 7.0.0,
// `apps/organizations_ext/models.py:50`.
const BILLED_PER_ARRIVED = 0.1
// The number that arrived, from the billed figure. Always whole, whatever the float the backend sent.
const arrived = (billed: number) => Math.round(billed / BILLED_PER_ARRIVED)

type Billed = { eventCount: number; transactionEventCount: number; logEventCount: number; uptimeCheckEventCount: number }
const toCounts = (billed: Billed): UsageCounts => ({
  errors: Math.round(billed.eventCount),
  transactions: Math.round(billed.transactionEventCount),
  logs: arrived(billed.logEventCount),
  uptime: arrived(billed.uptimeCheckEventCount),
})

export const totalOf = (counts: UsageCounts) => USAGE_CATEGORIES.reduce((sum, category) => sum + counts[category], 0)

const usageKeys = {
  all: (org: string) => ['organizations', org, 'usage'] as const,
  period: (org: string, periodsAgo: number) => [...usageKeys.all(org), 'period', periodsAgo] as const,
  daily: (org: string) => [...usageKeys.all(org), 'daily'] as const,
  projects: (org: string, ids: string[]) => [...usageKeys.all(org), 'projects', ids] as const,
}

const STALE_MS = 60_000

// What an organization took in over 30 days ending now, or over the 30 days before that (`periodsAgo: 1`).
export const usagePeriodQuery = (org: string, periodsAgo = 0) =>
  queryOptions({
    queryKey: usageKeys.period(org, periodsAgo),
    staleTime: STALE_MS,
    queryFn: async () =>
      toCounts(
        unwrap(
          await api.GET('/api/0/stripe/subscriptions/{organization_id_or_slug}/events_count/period/', {
            params: { path: orgPath(org), query: { periods_ago: periodsAgo } },
          }),
        ),
      ),
  })

// The same 30 days, one entry per day (UTC), oldest first. The first day is a part of a day.
export const usageDailyQuery = (org: string) =>
  queryOptions({
    queryKey: usageKeys.daily(org),
    staleTime: STALE_MS,
    queryFn: async (): Promise<UsageDay[]> =>
      unwrap(await api.GET('/api/0/stripe/subscriptions/{organization_id_or_slug}/events_count/daily/', { params: { path: orgPath(org) } })).data.map((day) => ({
        date: day.date,
        counts: toCounts(day),
      })),
  })

const HOUR_MS = 3600_000
const USAGE_DAYS = 30

type StatsResponse = { intervals: string[]; groups: { series: Record<string, (number | null)[]> }[] }
const FIELD = 'sum(quantity)'

// `days` is keyed by UTC date, as the daily counts are.
export type ProjectUsage = { id: string; errors: number; transactions: number; days: Record<string, { errors: number; transactions: number }> }

// Errors and transactions per project over the same 30 days. The backend only splits these two by project; logs and
// uptime checks are counted for the organization as a whole. Hourly, because its daily buckets only count the first
// hour of each day.
export const projectUsageQuery = (org: string, ids: string[]) =>
  queryOptions({
    queryKey: usageKeys.projects(org, ids),
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProjectUsage[]> => {
      const end = Math.floor(Date.now() / HOUR_MS) * HOUR_MS
      const start = end - USAGE_DAYS * 24 * HOUR_MS + HOUR_MS
      const series = async (id: string, category: 'error' | 'transaction') => {
        const { intervals, groups } = unwrap(
          await api.GET('/api/0/organizations/{organization_id_or_slug}/stats_v2/', {
            params: {
              path: orgPath(org),
              query: { category, field: FIELD, interval: '1h', project: [Number(id)], start: new Date(start).toISOString(), end: new Date(end).toISOString() },
            },
          }),
        ) as unknown as StatsResponse
        const counts = groups[0]?.series[FIELD] ?? []
        return intervals.map((interval, index) => ({ day: new Date(interval).toISOString().slice(0, 10), count: counts[index] ?? 0 }))
      }
      return Promise.all(
        ids.map(async (id) => {
          const [errors, transactions] = await Promise.all([series(id, 'error'), series(id, 'transaction')])
          const days: ProjectUsage['days'] = {}
          const at = (day: string) => (days[day] ??= { errors: 0, transactions: 0 })
          for (const { day, count } of errors) at(day).errors += count
          for (const { day, count } of transactions) at(day).transactions += count
          const sum = (rows: { count: number }[]) => rows.reduce((total, row) => total + row.count, 0)
          return { id, errors: sum(errors), transactions: sum(transactions), days }
        }),
      )
    },
  })

// The address a paid support license is registered to; empty without one.
export const licenseEmailQuery = queryOptions({
  queryKey: ['instance-license', 'billing-email'],
  queryFn: async () => unwrap(await api.GET('/api/0/instance-license/')).billingEmail,
  staleTime: Infinity,
  retry: false,
})
