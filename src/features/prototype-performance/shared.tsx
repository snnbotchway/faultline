// PROTOTYPE, throwaway. Three variants of the performance and logs screens, switched with ?variant=A|B|C.
// The question: how does a developer get from "something is slow" to the cause, and how are logs scanned
// and narrowed? Nothing here is production code; the winner is rebuilt under src/features/performance.
import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { projectsQuery } from '@/api/organizations'
import {
  nPlusOneQuery,
  transactionGroupQuery,
  transactionGroupsQuery,
  transactionSpansQuery,
  transactionTrendQuery,
  type NPlusOnePattern,
  type SpanGroup,
  type TransactionGroup,
  type TransactionSort,
  type TrendDay,
} from '@/api/performance'
import { recentReleasesQuery } from '@/api/releases'
import { releaseMarks, type Axis } from '@/features/issues/trend'
import { cn } from '@/lib/utils'

export const Variant = { A: 'A', B: 'B', C: 'C' } as const
export type Variant = (typeof Variant)[keyof typeof Variant]
const VARIANT_KEYS = Object.values(Variant)

export const PERFORMANCE_NAMES: Record<Variant, string> = { A: 'Ledger', B: 'Time spent', C: 'Findings' }
export const LOG_NAMES: Record<Variant, string> = { A: 'Table and panel', B: 'Stream and facets', C: 'Patterns' }

export const Flag = { repeats: 'repeats', slower: 'slower', failing: 'failing' } as const
export type Flag = (typeof Flag)[keyof typeof Flag]

export const SORTS: { value: TransactionSort; label: string }[] = [
  { value: '-avg_duration', label: 'Slowest' },
  { value: 'avg_duration', label: 'Fastest' },
  { value: '-count', label: 'Most requests' },
  { value: 'count', label: 'Fewest requests' },
  { value: '-created', label: 'Newest' },
]

export type PerformanceSearch = {
  variant: Variant
  // Not `sort`: the inbox's search has a `sort` of its own, and the router types every route's search together.
  order?: TransactionSort
  query?: string
  tab?: 'spans'
  op?: string
  group?: string
  flag?: Flag
  pattern?: number
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)
export const variantOf = (value: unknown): Variant => VARIANT_KEYS.find((key) => key === String(value).toUpperCase()) ?? Variant.A

export function validatePerformanceSearch(search: Record<string, unknown>): PerformanceSearch {
  const pattern = Number(search.pattern)
  return {
    variant: variantOf(search.variant),
    order: SORTS.find((sort) => sort.value === search.order)?.value,
    query: text(search.query),
    tab: search.tab === 'spans' ? 'spans' : undefined,
    op: text(search.op),
    group: search.group === undefined ? undefined : text(String(search.group)),
    flag: Object.values(Flag).find((flag) => flag === search.flag),
    pattern: Number.isInteger(pattern) && search.pattern !== undefined ? pattern : undefined,
  }
}

// The floating bar that flips between variants. Not part of any design being judged.
export function PrototypeSwitcher({ org, variant, names }: { org: string; variant: Variant; names: Record<Variant, string> }) {
  const navigate = useNavigate()
  const step = (by: number) => {
    const next = VARIANT_KEYS[(VARIANT_KEYS.indexOf(variant) + by + VARIANT_KEYS.length) % VARIANT_KEYS.length]!
    void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, variant: next }), replace: true })
  }
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })
  if (!import.meta.env.DEV) return null
  const jump = 'px-2 py-1 text-white/70 hover:text-white'
  return (
    <div
      data-prototype-switcher
      className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1 font-mono text-xs text-white shadow-float max-lg:bottom-[4.25rem]"
    >
      <button type="button" aria-label="Previous variant" onClick={() => step(-1)} className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-white/15">
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-1 whitespace-nowrap">
        {variant} ({names[variant]})
      </span>
      <button type="button" aria-label="Next variant" onClick={() => step(1)} className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-white/15">
        <ChevronRight className="size-4" />
      </button>
      <span className="ml-1 flex border-l border-white/25 pl-1 max-md:hidden">
        <Link to="/$org/prototype/performance" params={{ org }} search={{ variant }} className={jump}>
          transactions
        </Link>
        <Link to="/$org/prototype/performance/n-plus-one" params={{ org }} search={{ variant }} className={jump}>
          n+1
        </Link>
        <Link to="/$org/prototype/logs" params={{ org }} search={{ variant }} className={jump}>
          logs
        </Link>
      </span>
    </div>
  )
}

export function formatMs(value: number): string {
  if (value < 10) return `${value.toFixed(1)} ms`
  if (value < 1000) return `${Math.round(value)} ms`
  if (value < 60_000) return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)} s`
  const minutes = Math.floor(value / 60_000)
  return minutes < 60 ? `${minutes}m ${Math.round((value % 60_000) / 1000)}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export const formatPercent = (value: number) => `${value < 10 ? value.toFixed(1) : Math.round(value)}%`
export const formatTimes = (value: number) => `×${value >= 10 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, '')}`

export const titleOf = (group: Pick<TransactionGroup, 'method' | 'op'>) => group.method || group.op

// A transaction's name: the method or kind as code, then the route.
export function GroupName({ group, className }: { group: Pick<TransactionGroup, 'method' | 'op' | 'transaction'>; className?: string }) {
  return (
    <span className={cn('mono min-w-0', className)}>
      <span className="font-semibold">{titleOf(group)}</span> {group.transaction}
    </span>
  )
}

const DAY = 86_400
export const WEEK = 7

// Seven daily buckets ending today, on the backend's (UTC) day boundaries.
export function weekAxis(now: Date): Axis {
  const today = Math.floor(now.getTime() / 1000 / DAY) * DAY
  return { start: today - (WEEK - 1) * DAY, size: DAY, count: WEEK }
}

// The backend counts a request once per span group it touched, so its daily request count is too high by
// the number of span groups. `spanGroups` undoes that; without it the values are only good for comparing days.
export function perRequest(trend: TrendDay[] | undefined, axis: Axis, spanGroups = 1) {
  const time = Array.from({ length: axis.count }, () => 0)
  const requests = Array.from({ length: axis.count }, () => 0)
  for (const day of trend ?? []) {
    const index = Math.floor((Date.parse(day.date.endsWith('Z') ? day.date : `${day.date}Z`) / 1000 - axis.start) / axis.size)
    if (index < 0 || index >= axis.count || day.transactionCount <= 0) continue
    requests[index] = day.transactionCount / spanGroups
    time[index] = day.totalTime / requests[index]!
  }
  return { time, requests }
}

const SLOWER_FACTOR = 1.5
const RECENT_DAYS = 2

export type Regression = { factor: number; since: number }

// Slower: the last two days with requests average well above the days before them.
export function regression(time: number[]): Regression | undefined {
  const days = time.map((value, index) => ({ value, index })).filter((day) => day.value > 0)
  const recent = days.slice(-RECENT_DAYS)
  const before = days.slice(0, -RECENT_DAYS)
  if (before.length < 2 || recent.length < RECENT_DAYS) return undefined
  const mean = (list: typeof days) => list.reduce((sum, day) => sum + day.value, 0) / list.length
  const base = mean(before)
  const factor = mean(recent) / base
  if (factor < SLOWER_FACTOR) return undefined
  const since = days.find((day) => day.value > base * 1.25)?.index ?? recent[0]!.index
  return { factor, since }
}

export type SpanRow = SpanGroup & { times: number; time: number; repeats: boolean }
const REPEAT_THRESHOLD = 5

// What an average request spends in each span group over the last week.
export function averageRequest(group: TransactionGroup, spans: SpanGroup[], trend: TrendDay[]) {
  const counted = trend.reduce((sum, day) => sum + day.transactionCount, 0) / Math.max(1, spans.length)
  const requests = counted > 0 ? counted : group.count
  const rows: SpanRow[] = spans.map((span) => {
    const times = span.count / requests
    return { ...span, times, time: span.totalTime / requests, repeats: times > REPEAT_THRESHOLD }
  })
  const inSpans = rows.reduce((sum, row) => sum + row.time, 0)
  return { rows, requests, inSpans, total: Math.max(group.avgDuration, inSpans), outside: Math.max(0, group.avgDuration - inSpans) }
}

type Trends = Map<number, TrendDay[]>
const combineTrends = (ids: number[]) => (results: UseQueryResult<TrendDay[]>[]) => {
  const trends: Trends = new Map()
  results.forEach((result, index) => result.data && trends.set(ids[index]!, result.data))
  return trends
}

export type Insight = {
  group: TransactionGroup
  project?: string
  patterns: NPlusOnePattern[]
  days: number[]
  slower?: Regression
  failing: boolean
  // Share of all the time spent across the listed transactions.
  share: number
  totalTime: number
}

const FAILING_PERCENT = 5

// The list every variant starts from, with what is known about each transaction: its repeated queries,
// whether it got slower this week, and how much of the total time it accounts for.
export function useInsights(org: string, search: Pick<PerformanceSearch, 'order' | 'query'>) {
  const list = useQuery(transactionGroupsQuery(org, { sort: search.order, query: search.query }))
  const groups = useMemo(() => list.data?.items ?? [], [list.data])
  const ids = useMemo(() => groups.map((group) => group.id), [groups])
  const patterns = useQuery(nPlusOneQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data
  const releases = useQuery(recentReleasesQuery(org)).data
  const combine = useMemo(() => combineTrends(ids), [ids])
  const trends = useQueries({ queries: ids.map((id) => transactionTrendQuery(org, String(id))), combine })
  const now = useMemo(() => new Date(list.dataUpdatedAt || Date.now()), [list.dataUpdatedAt])
  const axis = useMemo(() => weekAxis(now), [now])
  const marks = useMemo(() => releaseMarks(releases ?? [], axis), [releases, axis])

  const insights = useMemo(() => {
    const all = groups.reduce((sum, group) => sum + group.count * group.avgDuration, 0)
    return groups.map((group): Insight => {
      const days = perRequest(trends.get(group.id), axis).time
      const totalTime = group.count * group.avgDuration
      return {
        group,
        project: projects?.find((project) => Number(project.id) === group.project)?.slug ?? undefined,
        patterns: (patterns ?? []).filter((pattern) => pattern.transactionName === group.transaction),
        days,
        slower: regression(days),
        failing: group.errorRate >= FAILING_PERCENT,
        share: all > 0 ? totalTime / all : 0,
        totalTime,
      }
    })
  }, [groups, trends, axis, projects, patterns])

  return { insights, patterns: patterns ?? [], axis, marks, loading: list.isPending, hits: list.data?.hits }
}

// The release a regression started with, if one went out around that day.
export function releaseAt(marks: { at: number; label: string }[], axis: Axis, dayIndex: number) {
  const from = (dayIndex - 0.5) / axis.count
  const to = (dayIndex + 1) / axis.count
  return marks.findLast((mark) => mark.at >= from && mark.at < to)?.label
}

export function useGroupDetail(org: string, id: string) {
  const group = useQuery(transactionGroupQuery(org, id))
  const spans = useQuery(transactionSpansQuery(org, id))
  const trend = useQuery(transactionTrendQuery(org, id))
  const releases = useQuery(recentReleasesQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data
  const now = useMemo(() => new Date(trend.dataUpdatedAt || Date.now()), [trend.dataUpdatedAt])
  const axis = useMemo(() => weekAxis(now), [now])
  const marks = useMemo(() => releaseMarks(releases ?? [], axis), [releases, axis])
  const detail = useMemo(() => {
    if (!group.data || !spans.data || !trend.data) return undefined
    const request = averageRequest(group.data, spans.data, trend.data)
    const series = perRequest(trend.data, axis, Math.max(1, spans.data.length))
    return { group: group.data, request, ...series, slower: regression(series.time) }
  }, [group.data, spans.data, trend.data, axis])
  return {
    detail,
    axis,
    marks,
    project: projects?.find((project) => Number(project.id) === group.data?.project)?.slug ?? undefined,
    missing: group.isError,
    loading: group.isPending || spans.isPending || trend.isPending,
  }
}

const SCALE_MIN = 1
const SCALE_MAX = 30_000
const SCALE_STEPS = [
  { at: 1, label: '1ms' },
  { at: 10, label: '10ms' },
  { at: 100, label: '100ms' },
  { at: 1000, label: '1s' },
  { at: 10_000, label: '10s' },
]
const onScale = (value: number) => Math.min(1, Math.max(0, Math.log10(Math.max(value, SCALE_MIN) / SCALE_MIN) / Math.log10(SCALE_MAX / SCALE_MIN)))

// One duration scale for every row of a list, labelled once above the rows. Logarithmic: endpoints run
// from a few milliseconds to several seconds, and a linear scale would flatten all but the slowest.
export function DurationScale({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-4 font-mono text-xs text-muted-foreground', className)} aria-hidden>
      {SCALE_STEPS.map((step) => (
        <span key={step.at} className="absolute top-0 -translate-x-1/2 first:translate-x-0" style={{ left: `${onScale(step.at) * 100}%` }}>
          {step.label}
        </span>
      ))}
    </div>
  )
}

// Typical (p50) to slow (p95) on the shared scale.
export function DurationBar({ p50, p95, hot, className }: { p50: number; p95: number; hot?: boolean; className?: string }) {
  return (
    <div className={cn('relative h-3 border-b border-grid', className)} aria-hidden>
      {SCALE_STEPS.slice(1).map((step) => (
        <span key={step.at} className="absolute inset-y-0 w-px bg-grid" style={{ left: `${onScale(step.at) * 100}%` }} />
      ))}
      <span className="absolute bottom-0 left-0 h-1.5 bg-foreground/25" style={{ width: `${onScale(p50) * 100}%` }} />
      <span
        className={cn('absolute bottom-0 h-1.5', hot ? 'bg-trend-spiking' : 'bg-foreground/60')}
        style={{ left: `${onScale(p50) * 100}%`, width: `${Math.max(0.5, (onScale(p95) - onScale(p50)) * 100)}%` }}
      />
    </div>
  )
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('label-caps', className)}>{children}</h2>
}

export function Stat({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="label-caps">{label}</dt>
      <dd className="mt-0.5 font-mono text-xl font-medium tabular-nums">{children}</dd>
    </div>
  )
}

export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-11 items-center gap-4 border-b px-3 md:px-4">
          <span className="h-3 w-1/3 animate-pulse bg-muted" />
          <span className="ml-auto h-3 w-24 animate-pulse bg-muted" />
        </div>
      ))}
    </div>
  )
}
