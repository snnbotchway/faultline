import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { LogLevel, LogResourceType, logHitsQuery, logListQuery, logQuery, logResourcesQuery, logStatsQuery, type LogEvent, type LogFilters, type LogStats } from '@/api/logs'
import { projectsQuery } from '@/api/organizations'
import { hourEnd, rangeOf, type LogSearch } from './search'

const HOUR = 3600

export type Bucket = { start: number; errors: number; warnings: number; other: number }
export const bucketTotal = (bucket: Bucket) => bucket.errors + bucket.warnings + bucket.other

// A count the backend may have stopped at its limit.
export type Count = { n: number; capped: boolean }
const exact = (n: number): Count => ({ n, capped: false })
const sum = (stats: LogStats | undefined) => stats && exact(stats.series.reduce((total, series) => total + series.data.reduce((a, b) => a + b, 0), 0))

function hourly(stats: LogStats | undefined, hours: number, now: number): Bucket[] {
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
  const hits: Count | undefined = first?.hits === undefined ? undefined : { n: first.hits, capped: first.maxHits !== undefined && first.hits >= first.maxHits }
  // The number above the list. The statistics are exact, so they are used whenever they can answer.
  const statistical = !search.query && !search.host && !search.traceId
  const picked = buckets.find((bucket) => bucket.start === search.hour)
  const total: Count | undefined = search.spanId
    ? exact(logs.length)
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
    projects: projects ?? [],
    projectOf: (log: LogEvent) => projects?.find((project) => Number(project.id) === log.projectId)?.slug ?? undefined,
  }
}

export type Logs = ReturnType<typeof useLogs>

// Each count is a request of its own, so only the first values of a long list are counted.
const COUNTED = 20

// A count beside every value the list can be narrowed by, each with the other filters applied. Levels,
// services, environments and projects come from the hourly statistics, which are exact. The statistics
// know nothing about hosts, so a host's count is the list's own, which the backend stops at its limit.
export function useCounts(org: string, logs: Logs) {
  const { scope, filters, services, environments, hosts, projects } = logs
  const byLevel = useQuery(logStatsQuery(org, { ...scope, level: undefined })).data
  const stats = (list: LogFilters[]) => list.map((item) => logStatsQuery(org, item))
  const byService = useQueries({ queries: stats(services.slice(0, COUNTED).map((service) => ({ ...scope, service }))) })
  const byEnvironment = useQueries({ queries: stats(environments.slice(0, COUNTED).map((environment) => ({ ...scope, environment }))) })
  const byProject = useQueries({ queries: stats(projects.slice(0, COUNTED).map((project) => ({ ...scope, project: [Number(project.id)] }))) })
  const byHost = useQueries({ queries: hosts.slice(0, COUNTED).map((host) => logHitsQuery(org, { ...filters, host })) })
  const keyed = <T,>(keys: string[], value: (index: number) => T) => Object.fromEntries(keys.map((key, index) => [key, value(index)])) as Record<string, T>
  return {
    level: Object.fromEntries((byLevel?.series ?? []).map((series) => [series.name, exact(series.data.reduce((a, b) => a + b, 0))])) as Record<string, Count | undefined>,
    service: keyed(services, (index) => sum(byService[index]?.data)),
    environment: keyed(environments, (index) => sum(byEnvironment[index]?.data)),
    project: keyed(
      projects.map((project) => String(project.id)),
      (index) => sum(byProject[index]?.data),
    ),
    host: keyed(hosts, (index): Count | undefined => {
      const data = byHost[index]?.data
      return data && { n: data.hits, capped: data.capped }
    }),
  }
}

export type Counts = ReturnType<typeof useCounts>
