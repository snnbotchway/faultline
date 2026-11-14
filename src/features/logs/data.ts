import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { LogLevel, LogResourceType, logHitsQuery, logListQuery, logQuery, logResourcesQuery, logStatsQuery, type LogEvent, type LogFilters, type LogStats } from '@/api/logs'
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

  // The backend cannot filter by span, so a span's logs are picked from its trace's, all of them loaded.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list
  useEffect(() => {
    if (search.spanId && hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [search.spanId, hasNextPage, isFetchingNextPage, fetchNextPage])

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
  // The number above the list. The statistics are exact, so they are used whenever they can answer.
  const statistical = !search.query && !search.host && !search.traceId
  const picked = buckets.find((bucket) => bucket.start === search.hour)
  const total: Hits | undefined = search.spanId
    ? list.hasNextPage
      ? undefined
      : exact(logs.length)
    : !statistical || !stats.data
      ? hits
      : search.hour === undefined
        ? exact(buckets.reduce((all, bucket) => all + bucketTotal(bucket), 0))
        : picked
          ? exact(bucketTotal(picked))
          : hits

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
    projects: projects ?? [],
    projectOf: (log: LogEvent) => projects?.find((project) => Number(project.id) === log.projectId)?.slug ?? undefined,
  }
}

export type Logs = ReturnType<typeof useLogs>

// A count beside a filter value: loading (undefined), how many logs it leaves, or not available.
export const Uncounted = { unavailable: 'unavailable' } as const
export type Count = Hits | typeof Uncounted.unavailable | undefined

// Each count is a request of its own, so only the first values of a long list are counted.
const COUNTED = 10
// Counts are a guide, not a live feed: they are kept for a while and not refetched on focus.
const COUNT_FRESH = { staleTime: 5 * 60_000, refetchOnWindowFocus: false } as const

// A count beside every value the list can be narrowed by, each with the other filters applied, so
// picking it leaves that many logs. Levels, services, environments and projects come from the hourly
// statistics, which cannot apply a text search, a host or a trace; with one of those set they are not
// available rather than wrong. Hosts are counted by the list itself, which the backend stops at its limit.
// A project that none of the loaded logs come from is counted only once the whole list is loaded, as 0.
// Nothing is fetched while `visible` is false.
export function useCounts(org: string, logs: Logs, search: LogSearch, visible: boolean) {
  const { scope, filters, services, environments, hosts, projects, loaded, list } = logs
  const statistical = visible && !search.query && !search.host && !search.traceId
  const counted: LogFilters = useMemo(
    () => (search.hour === undefined ? scope : { ...scope, start: filters.start, end: filters.end }),
    [scope, search.hour, filters.start, filters.end],
  )
  const withLogs = useMemo(() => new Set(loaded.map((log) => log.projectId)), [loaded])
  const countedProjects = projects.filter((project) => withLogs.has(Number(project.id))).slice(0, COUNTED)
  const stats = (list: LogFilters[]) => (statistical ? list.map((item) => ({ ...logStatsQuery(org, item), ...COUNT_FRESH })) : [])
  const byLevel = useQuery({ ...logStatsQuery(org, { ...counted, level: undefined }), ...COUNT_FRESH, enabled: statistical })
  const byService = useQueries({ queries: stats(services.slice(0, COUNTED).map((service) => ({ ...counted, service }))) })
  const byEnvironment = useQueries({ queries: stats(environments.slice(0, COUNTED).map((environment) => ({ ...counted, environment }))) })
  const byProject = useQueries({ queries: stats(countedProjects.map((project) => ({ ...counted, project: [Number(project.id)] }))) })
  const byHost = useQueries({ queries: visible ? hosts.slice(0, COUNTED).map((host) => ({ ...logHitsQuery(org, { ...filters, host }), ...COUNT_FRESH })) : [] })

  const unavailable = !statistical && visible ? Uncounted.unavailable : undefined
  const keyed = (keys: string[], value: (key: string, index: number) => Count) => Object.fromEntries(keys.map((key, index) => [key, value(key, index)])) as Record<string, Count>
  const fromStats = (results: { data?: LogStats }[]) => (_: string, index: number) => (index >= COUNTED ? Uncounted.unavailable : (unavailable ?? sum(results[index]?.data)))
  return {
    level: (level: LogLevel): Count => {
      if (unavailable || !byLevel.data) return unavailable
      const series = byLevel.data.series.find((item) => item.name === level)
      return exact(series ? series.data.reduce((a, b) => a + b, 0) : 0)
    },
    service: keyed(services, fromStats(byService)),
    environment: keyed(environments, fromStats(byEnvironment)),
    project: keyed(
      projects.map((project) => String(project.id)),
      (id) => {
        const index = countedProjects.findIndex((project) => String(project.id) === id)
        if (index >= 0) return unavailable ?? sum(byProject[index]?.data)
        return list.hasNextPage || list.isPending ? Uncounted.unavailable : exact(0)
      },
    ),
    host: keyed(hosts, (_, index): Count => {
      if (index >= COUNTED) return Uncounted.unavailable
      const data = byHost[index]?.data
      return data && { n: data.hits, capped: data.capped }
    }),
  }
}

export type Counts = ReturnType<typeof useCounts>
