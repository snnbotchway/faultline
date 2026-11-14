import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { LogLevel, LogResourceType, PAGE_SIZE, logHitsQuery, logListQuery, logQuery, logResourcesQuery, logStatsQuery, type LogEvent, type LogFilters, type LogStats } from '@/api/logs'
import { projectsQuery } from '@/api/organizations'
import type { Hits } from '@/lib/format'
import { HOUR } from '@/lib/time'
import { hourEnd, rangeOf, type LogSearch } from './search'

export type Bucket = { start: number; errors: number; warnings: number; other: number }
export const bucketTotal = (bucket: Bucket) => bucket.errors + bucket.warnings + bucket.other

const exact = (n: number): Hits => ({ n, capped: false })
const sum = (stats: LogStats | undefined) => stats && exact(stats.series.reduce((total, series) => total + series.data.reduce((a, b) => a + b, 0), 0))

// One bucket per hour of the window, ending with the current hour, with the backend's counts per level
// sorted into errors (and fatal), warnings and the rest. `now` is in milliseconds.
export function hourly(stats: LogStats | undefined, hours: number, now: number): Bucket[] {
  const last = Math.floor(now / 1000 / HOUR) * HOUR
  const buckets: Bucket[] = Array.from({ length: hours }, (_, index) => ({ start: last - (hours - 1 - index) * HOUR, errors: 0, warnings: 0, other: 0 }))
  stats?.intervals.forEach((interval, at) => {
    const bucket = buckets[Math.round((Date.parse(interval) / 1000 - buckets[0]!.start) / HOUR)]
    if (!bucket) return
    for (const series of stats.series) {
      const count = series.data[at] ?? 0
      if (series.name === LogLevel.error || series.name === LogLevel.fatal) bucket.errors += count
      else if (series.name === LogLevel.warn) bucket.warnings += count
      else bucket.other += count
    }
  })
  return buckets
}

// A span's logs are picked from at most this many pages of its trace's.
const SPAN_PAGES = 5
export const SPAN_LIMIT = SPAN_PAGES * PAGE_SIZE

// The number above the list. The statistics are exact, so they are used whenever they can answer:
// `buckets` is given only once they have loaded. A span's logs are counted from its trace's, so the
// count waits for those to load, and says it may be more once they stop at the limit.
export function totalOf({ search, hits, buckets, spanLogs, spanLoading, spanCapped }: { search: LogSearch; hits: Hits | undefined; buckets: Bucket[] | undefined; spanLogs: number; spanLoading: boolean; spanCapped: boolean }): Hits | undefined {
  if (search.spanId) {
    if (spanLoading) return undefined
    return { n: spanLogs, capped: spanCapped }
  }
  if (search.query || search.host || search.traceId || !buckets) return hits
  if (search.hour === undefined) return exact(buckets.reduce((all, bucket) => all + bucketTotal(bucket), 0))
  const picked = buckets.find((bucket) => bucket.start === search.hour)
  return picked ? exact(bucketTotal(picked)) : hits
}

export function useLogs(org: string, search: LogSearch) {
  const range = rangeOf(search)
  // What the hourly statistics can filter by. They know nothing of the text search, hosts or traces.
  const scope: LogFilters = useMemo(
    () => ({
      level: search.level,
      service: search.service,
      environment: search.environment,
      project: search.project,
      start: `now-${range.value}`,
    }),
    [search.level, search.service, search.environment, search.project, range.value],
  )
  const filters: LogFilters = useMemo(
    () => ({
      ...scope,
      query: search.query,
      host: search.host,
      traceId: search.traceId,
      ...(search.hour === undefined ? {} : { start: new Date(search.hour * 1000).toISOString(), end: new Date(hourEnd(search.hour) * 1000).toISOString() }),
    }),
    [scope, search.query, search.host, search.traceId, search.hour],
  )
  const list = useInfiniteQuery(logListQuery(org, filters))
  const stats = useQuery(logStatsQuery(org, scope))
  const resources = useQuery(logResourcesQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data

  // The backend cannot filter by span, so a span's logs are picked from its trace's, up to a limit.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list
  const pages = list.data?.pages.length ?? 0
  const spanCapped = !!search.spanId && hasNextPage && pages >= SPAN_PAGES
  useEffect(() => {
    if (search.spanId && hasNextPage && !isFetchingNextPage && pages < SPAN_PAGES) void fetchNextPage()
  }, [search.spanId, hasNextPage, isFetchingNextPage, fetchNextPage, pages])

  const loaded = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data])
  const logs = useMemo(() => (search.spanId ? loaded.filter((log) => log.spanID === search.spanId) : loaded), [loaded, search.spanId])
  const [opened] = useState(Date.now)
  const now = stats.dataUpdatedAt || list.dataUpdatedAt || opened
  const buckets = useMemo(() => hourly(stats.data, range.hours, now), [stats.data, range.hours, now])

  // A link may open a log that the list has not loaded.
  const listed = logs.find((log) => log.id === search.log)
  const fetched = useQuery({ ...logQuery(org, search.log ?? ''), enabled: !!search.log && !listed && !list.isPending }).data
  const open = search.log ? (listed ?? fetched) : undefined

  const first = list.data?.pages[0]
  const hits: Hits | undefined = first?.hits === undefined ? undefined : { n: first.hits, capped: first.maxHits !== undefined && first.hits >= first.maxHits }
  const total = totalOf({ search, hits, buckets: stats.data && buckets, spanLogs: logs.length, spanLoading: hasNextPage && !spanCapped, spanCapped })

  const { services, environments, hosts } = useMemo(() => {
    const names = (type: LogResourceType) =>
      (resources ?? [])
        .filter((resource) => resource.type === type)
        .map((resource) => resource.name)
        .sort()
    return { services: names(LogResourceType.service), environments: names(LogResourceType.environment), hosts: names(LogResourceType.host) }
  }, [resources])

  return {
    scope,
    filters,
    list,
    logs,
    open,
    total,
    buckets,
    range,
    services,
    environments,
    hosts,
    loaded,
    spanCapped,
    projects: projects ?? [],
    projectOf: (log: LogEvent) => projects?.find((project) => Number(project.id) === log.projectId)?.slug ?? undefined,
  }
}

export type Logs = ReturnType<typeof useLogs>

// A count beside a filter value: still loading, how many logs picking it leaves, or not available.
export const CountState = { loading: 'loading', unavailable: 'unavailable', counted: 'counted' } as const
export type CountState = (typeof CountState)[keyof typeof CountState]
export type Count = { state: typeof CountState.loading } | { state: typeof CountState.unavailable } | { state: typeof CountState.counted; hits: Hits }

const LOADING: Count = { state: CountState.loading }
const UNAVAILABLE: Count = { state: CountState.unavailable }
const counted = (hits: Hits | undefined): Count => (hits ? { state: CountState.counted, hits } : LOADING)

// Each count is a request of its own, so only the first values of a long list are counted.
const COUNTED = 10
// Counts are a guide, not a live feed: they are kept for a while and not refetched on focus.
const COUNT_FRESH = { staleTime: 5 * 60_000, refetchOnWindowFocus: false } as const

// A project's count. Only projects that some loaded log comes from are counted, the first `COUNTED` of
// them (`stats`, which is undefined for the rest). A project none of them come from has no logs only when
// the whole list is loaded and no project filter has left it out; otherwise it is not known.
export function projectCount({ stats, withLogs, filtered, complete }: { stats: Count | undefined; withLogs: boolean; filtered: boolean; complete: boolean }): Count {
  if (stats) return stats
  if (withLogs || filtered || !complete) return UNAVAILABLE
  return counted(exact(0))
}

// A count beside every value the list can be narrowed by, each with the other filters applied, so
// picking it leaves that many logs. Levels, services, environments and projects come from the hourly
// statistics, which cannot apply a text search, a host or a trace; with one of those set they are not
// available rather than wrong. Hosts are counted by the list itself, which the backend stops at its
// limit, and cannot pick out a span. Nothing is fetched while `visible` is false.
export function useCounts(org: string, logs: Logs, search: LogSearch, visible: boolean) {
  const { scope, filters, services, environments, hosts, projects, loaded, list } = logs
  const statistical = visible && !search.query && !search.host && !search.traceId && !search.spanId
  const range: LogFilters = useMemo(
    () => (search.hour === undefined ? scope : { ...scope, start: filters.start, end: filters.end }),
    [scope, search.hour, filters.start, filters.end],
  )
  const withLogs = useMemo(() => new Set(loaded.map((log) => log.projectId)), [loaded])
  const countedProjects = projects.filter((project) => withLogs.has(Number(project.id))).slice(0, COUNTED)
  const stats = (list: LogFilters[]) => (statistical ? list.map((item) => ({ ...logStatsQuery(org, item), ...COUNT_FRESH })) : [])
  const byLevel = useQuery({ ...logStatsQuery(org, { ...range, level: undefined }), ...COUNT_FRESH, enabled: statistical })
  const byService = useQueries({ queries: stats(services.slice(0, COUNTED).map((service) => ({ ...range, service }))) })
  const byEnvironment = useQueries({ queries: stats(environments.slice(0, COUNTED).map((environment) => ({ ...range, environment }))) })
  const byProject = useQueries({ queries: stats(countedProjects.map((project) => ({ ...range, project: [Number(project.id)] }))) })
  const hostsCounted = visible && !search.spanId
  const byHost = useQueries({ queries: hostsCounted ? hosts.slice(0, COUNTED).map((host) => ({ ...logHitsQuery(org, { ...filters, host }), ...COUNT_FRESH })) : [] })

  // While hidden nothing is fetched, and nothing shows either.
  const fallback = visible ? UNAVAILABLE : LOADING
  const fromStats = (data: LogStats | undefined) => (statistical ? counted(sum(data)) : fallback)
  const keyed = (keys: string[], value: (key: string, index: number) => Count) => Object.fromEntries(keys.map((key, index) => [key, value(key, index)])) as Record<string, Count>
  const listed = (results: { data?: LogStats }[]) => (_: string, index: number) => (index >= COUNTED ? UNAVAILABLE : fromStats(results[index]?.data))
  return {
    level: (level: LogLevel): Count => {
      if (!statistical || !byLevel.data) return fromStats(undefined)
      const series = byLevel.data.series.find((item) => item.name === level)
      return counted(exact(series ? series.data.reduce((a, b) => a + b, 0) : 0))
    },
    service: keyed(services, listed(byService)),
    environment: keyed(environments, listed(byEnvironment)),
    project: keyed(
      projects.map((project) => String(project.id)),
      (id) => {
        const index = countedProjects.findIndex((project) => String(project.id) === id)
        return projectCount({
          stats: index < 0 ? undefined : fromStats(byProject[index]?.data),
          withLogs: withLogs.has(Number(id)),
          filtered: search.project !== undefined,
          complete: !list.isPending && !list.hasNextPage,
        })
      },
    ),
    host: keyed(hosts, (_, index): Count => {
      if (!hostsCounted) return fallback
      if (index >= COUNTED) return UNAVAILABLE
      const data = byHost[index]?.data
      return counted(data && { n: data.hits, capped: data.capped })
    }),
  }
}

export type Counts = ReturnType<typeof useCounts>
