import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useMemo } from 'react'
import { HttpStatus, hasStatus } from '@/api/client'
import { projectsQuery } from '@/api/organizations'
import {
  nPlusOneQuery,
  transactionGroupQuery,
  transactionGroupsQuery,
  transactionSpansQuery,
  transactionTrendQuery,
  type NPlusOnePattern,
  type TransactionGroup,
  type TrendDay,
} from '@/api/performance'
import { recentReleasesQuery } from '@/api/releases'
import { releaseMarks } from '@/features/issues/trend'
import { averageRequest, patternKey, regression, releaseAt, shareOfRequest, spanTimePerRequest, weekAxis, type Regression } from './measures'
import { transactionSort, type PerformanceSearch } from './search'

// A transaction counts as failing from this share of failed requests, in percent.
export const FAILING_PERCENT = 5

// Each trend is a request of its own, so only the transactions that cost the most time get one.
const TREND_LIMIT = 100

export type Transaction = {
  group: TransactionGroup
  project?: string
  // Everything it has ever spent: requests times the average.
  totalTime: number
  // Its part of the time spent across the listed transactions, from 0 to 1.
  share: number
  repeats: NPlusOnePattern[]
  slower?: Regression
  // The release that went out when it got slower.
  since?: string
  failing: boolean
}

export type Repeat = NPlusOnePattern & { key: string; transaction?: Transaction; perRequest: number; request: number; share: number }

type Trends = Map<number, TrendDay[]>
const collect = (ids: number[]) => (results: UseQueryResult<TrendDay[]>[]) => {
  const trends: Trends = new Map()
  results.forEach((result, index) => result.data && trends.set(ids[index]!, result.data))
  return trends
}

function useWeek(org: string, updatedAt: number) {
  const releases = useQuery(recentReleasesQuery(org)).data
  const axis = useMemo(() => weekAxis(new Date(updatedAt)), [updatedAt])
  const marks = useMemo(() => releaseMarks(releases ?? [], axis), [releases, axis])
  return { axis, marks }
}

// The transactions with what is known about each: the queries it repeats, whether it got slower this
// week, and how much of the total time it accounts for.
export function useTransactions(org: string, search: Pick<PerformanceSearch, 'order' | 'query' | 'project'>) {
  const { project } = search
  const list = useQuery(transactionGroupsQuery(org, { sort: transactionSort(search), query: search.query, project }))
  const patterns = useQuery(nPlusOneQuery(org, { project }))
  const projects = useQuery(projectsQuery(org)).data
  const { axis, marks } = useWeek(org, list.dataUpdatedAt)

  const groups = list.data
  const trendIds = useMemo(
    () =>
      [...(groups ?? [])]
        .sort((a, b) => b.count * b.avgDuration - a.count * a.avgDuration)
        .slice(0, TREND_LIMIT)
        .map((group) => group.id),
    [groups],
  )
  const combine = useMemo(() => collect(trendIds), [trendIds])
  const trends = useQueries({ queries: trendIds.map((id) => transactionTrendQuery(org, String(id))), combine })

  const transactions = useMemo(() => {
    const all = (groups ?? []).reduce((sum, group) => sum + group.count * group.avgDuration, 0)
    return (groups ?? []).map((group): Transaction => {
      const slower = regression(spanTimePerRequest(trends.get(group.id), axis))
      const totalTime = group.count * group.avgDuration
      return {
        group,
        project: projects?.find((item) => Number(item.id) === group.project)?.slug ?? undefined,
        totalTime,
        share: all > 0 ? totalTime / all : 0,
        repeats: (patterns.data ?? []).filter((pattern) => pattern.transactionName === group.transaction),
        slower,
        since: slower && releaseAt(marks, axis, slower.since),
        failing: group.errorRate >= FAILING_PERCENT,
      }
    })
  }, [groups, trends, axis, marks, projects, patterns.data])

  const repeats = useMemo(
    () =>
      (patterns.data ?? []).map((pattern): Repeat => {
        const transaction = transactions.find((item) => item.group.transaction === pattern.transactionName)
        return { ...pattern, key: patternKey(pattern), transaction, ...shareOfRequest(pattern, transaction?.group.avgDuration) }
      }),
    [patterns.data, transactions],
  )

  return {
    transactions,
    repeats,
    loading: list.isPending,
    failed: list.isError,
    denied: hasStatus(list.error, HttpStatus.forbidden),
    retry: () => void list.refetch(),
    // Spans are read from the backend's cold storage. With transactions listed and not one day of span
    // data among them, that storage is most likely turned off.
    noSpanData: !!groups && groups.length > 0 && trendIds.length > 0 && trends.size === trendIds.length && [...trends.values()].every((trend) => trend.length === 0),
  }
}

export type Transactions = ReturnType<typeof useTransactions>

export function useTransaction(org: string, id: string) {
  const group = useQuery(transactionGroupQuery(org, id))
  const spans = useQuery(transactionSpansQuery(org, id))
  const trend = useQuery(transactionTrendQuery(org, id))
  const projects = useQuery(projectsQuery(org)).data
  const { axis, marks } = useWeek(org, trend.dataUpdatedAt)
  const detail = useMemo(() => {
    if (!group.data || !spans.data || !trend.data) return undefined
    const time = spanTimePerRequest(trend.data, axis, Math.max(1, spans.data.length))
    const slower = regression(time)
    return { group: group.data, request: averageRequest(group.data, spans.data, trend.data), time, slower, since: slower && releaseAt(marks, axis, slower.since) }
  }, [group.data, spans.data, trend.data, axis, marks])
  const error = group.error ?? spans.error ?? trend.error
  return {
    detail,
    axis,
    marks,
    project: projects?.find((item) => Number(item.id) === group.data?.project)?.slug ?? undefined,
    missing: hasStatus(group.error, HttpStatus.notFound),
    denied: hasStatus(group.error, HttpStatus.forbidden),
    failed: !!error,
    retry: () => void Promise.all([group.refetch(), spans.refetch(), trend.refetch()]),
  }
}
