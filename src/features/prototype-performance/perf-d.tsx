// PROTOTYPE, throwaway. Variant D, the revision after the first pick: B's ranked list with the transaction
// beside it, A's search, sort and span-kind filter, and C's page for a query that repeats.
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowDownWideNarrow, ChevronLeft, ChevronRight, CircleAlert, Repeat, Search, TrendingUp } from 'lucide-react'
import { Fragment, useState, type FormEvent } from 'react'
import type { NPlusOnePattern } from '@/api/performance'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { compact, dayLabel } from '@/features/issues/format'
import { Trace } from '@/features/issues/trace'
import { Trend, type Axis, type Mark } from '@/features/issues/trend'
import { useHotkeys } from '@/lib/hotkeys'
import { cn } from '@/lib/utils'
import {
  DurationBar,
  DurationScale,
  Flag,
  SORTS,
  SectionLabel,
  SkeletonRows,
  Stat,
  Variant,
  formatMs,
  formatPercent,
  formatTimes,
  releaseAt,
  useGroupDetail,
  useInsights,
  type Insight,
  type PerformanceSearch,
  type SpanRow,
} from './shared'

const variant = Variant.D
const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches

// An identifier that may wrap after a dot, underscore, slash or colon, and never in the middle of a word.
function Breakable({ text }: { text: string }) {
  return (
    <>
      {text.split(/(?<=[._/:])/).map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <wbr />}
          {part}
        </Fragment>
      ))}
    </>
  )
}

function Name({ group, className }: { group: { method: string | null; op: string; transaction: string }; className?: string }) {
  return (
    <span className={cn('mono min-w-0', className)}>
      <span className="font-semibold">{group.method || group.op}</span> <Breakable text={group.transaction} />
    </span>
  )
}

const MOST_TIME = ''
const ORDERS = [{ value: MOST_TIME, label: 'Most time spent' }, ...SORTS]
const Measure = { time: 'time', duration: 'duration', requests: 'requests' } as const
type Measure = (typeof Measure)[keyof typeof Measure]
const measureOf = (order: PerformanceSearch['order']): Measure => (!order ? Measure.time : order.includes('avg_duration') ? Measure.duration : order.includes('count') ? Measure.requests : Measure.time)

const FLAGS = [
  { flag: Flag.slower, label: 'Slower this week', test: (insight: Insight) => !!insight.slower },
  { flag: Flag.failing, label: 'Failing', test: (insight: Insight) => insight.failing },
]
const CHIP = 'flex h-7 shrink-0 cursor-pointer items-center gap-1.5 border px-2.5 text-sm max-lg:h-9'
const chip = (on: boolean) => cn(CHIP, on ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent')

// What to look at: everything, the queries that repeat, or the transactions with a problem. The chips wrap
// on a phone, so none is hidden off the edge.
function Views({ org, search, insights, patterns, repeats }: { org: string; search: PerformanceSearch; insights: Insight[]; patterns: number; repeats?: boolean }) {
  const list = (flag?: Flag) => ({ to: '/$org/prototype/performance', params: { org }, search: { variant, query: search.query, order: search.order, flag } }) as const
  const count = (on: boolean, value: number) => <span className={cn('mono', !on && 'text-muted-foreground')}>{value}</span>
  const all = !repeats && !search.flag
  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Show">
      <Link {...list()} aria-current={all ? 'page' : undefined} className={chip(all)}>
        All {count(all, insights.length)}
      </Link>
      <Link to="/$org/prototype/performance/n-plus-one" params={{ org }} search={{ variant }} aria-current={repeats ? 'page' : undefined} className={chip(!!repeats)}>
        Repeated queries {count(!!repeats, patterns)}
      </Link>
      {FLAGS.map((item) => {
        const on = !repeats && search.flag === item.flag
        return (
          <Link key={item.flag} {...list(item.flag)} aria-current={on ? 'page' : undefined} className={chip(on)}>
            {item.label} {count(on, insights.filter(item.test).length)}
          </Link>
        )
      })}
    </nav>
  )
}

function Problems({ insight, since }: { insight: Insight; since?: string }) {
  const worst = Math.max(0, ...insight.patterns.map((pattern) => pattern.spansPerTxn))
  if (!worst && !insight.slower && !insight.failing) return null
  return (
    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
      {worst > 0 && (
        <span className="flex items-center gap-1">
          <Repeat className="size-3.5 text-trend-spiking" />
          Query repeats <span className="mono font-semibold">{formatTimes(worst)}</span>
        </span>
      )}
      {insight.slower && (
        <span className="flex items-center gap-1">
          <TrendingUp className="size-3.5 text-trend-spiking" />
          <span className="mono font-semibold">{insight.slower.factor.toFixed(1)}×</span> slower{since ? ` since ${since}` : ''}
        </span>
      )}
      {insight.failing && (
        <span className="flex items-center gap-1">
          <CircleAlert className="size-3.5 text-destructive" />
          <span className="mono font-semibold">{formatPercent(insight.group.errorRate)}</span> failed
        </span>
      )}
    </span>
  )
}

export function ListD({ org, search }: { org: string; search: PerformanceSearch }) {
  const navigate = useNavigate()
  const { insights, patterns, axis, marks, loading } = useInsights(org, { order: search.order, query: search.query })
  const measure = measureOf(search.order)
  // The backend sorts by duration, requests or age; time spent is ranked here.
  const ordered = search.order ? insights : [...insights].sort((a, b) => b.totalTime - a.totalTime)
  const test = FLAGS.find((item) => item.flag === search.flag)?.test
  const rows = test ? ordered.filter(test) : ordered
  const open = rows.find((row) => String(row.group.id) === search.group) ?? rows[0]
  const peakShare = Math.max(...insights.map((insight) => insight.share), 0.0001)
  const peakCount = Math.max(...insights.map((insight) => insight.group.count), 1)
  const go = (patch: Partial<PerformanceSearch>) => void navigate({ to: '/$org/prototype/performance', params: { org }, search: { ...search, variant, ...patch }, replace: true })
  const [text, setText] = useState(search.query ?? '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    go({ query: text.trim() || undefined, group: undefined })
  }
  const move = (step: number) => {
    const index = rows.findIndex((row) => row === open)
    const next = rows[Math.max(0, Math.min(rows.length - 1, index + step))]
    if (next) go({ group: String(next.group.id) })
  }
  useHotkeys({ j: () => move(1), k: () => move(-1) })
  return (
    <>
      <PageBar className="max-lg:h-auto max-lg:flex-wrap max-lg:gap-2 max-lg:py-2">
        <Views org={org} search={search} insights={insights} patterns={patterns.length} />
        <form onSubmit={submit} role="search" className="flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-2.5 focus-within:border-brand max-lg:h-9 lg:ml-auto lg:max-w-xs">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input value={text} onChange={(event) => setText(event.target.value)} aria-label="Search transactions" spellCheck={false} autoCapitalize="off" className="mono h-full min-w-0 flex-1 bg-transparent outline-none max-lg:text-[1rem]" />
        </form>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="shrink-0 max-lg:h-9" aria-label="Sort">
              <ArrowDownWideNarrow />
              {ORDERS.find((item) => item.value === (search.order ?? MOST_TIME))?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={search.order ?? MOST_TIME} onValueChange={(value) => go({ order: SORTS.find((item) => item.value === value)?.value, group: undefined })}>
              {ORDERS.map((item) => (
                <DropdownMenuRadioItem key={item.value} value={item.value}>
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageBar>
      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <Screen title={search.query ? 'No transactions match this search' : search.flag ? 'No transactions here' : 'No transactions yet'} />
      ) : (
        <div className="flex flex-1 items-start">
          <div className="min-w-0 flex-1 lg:max-w-[46%] lg:border-r">
            <div className="flex items-end justify-between gap-4 border-b px-3 py-1.5 md:px-4">
              {measure === Measure.duration ? <DurationScale className="mr-20 flex-1" /> : <span className="label-caps">{measure === Measure.time ? 'Share of time spent' : 'Requests'}</span>}
              <span className="label-caps shrink-0 text-right">{measure === Measure.time ? 'Total, all time' : measure === Measure.duration ? 'Slow, all time' : 'All time'}</span>
            </div>
            <ul>
              {rows.map((insight) => {
                const { group } = insight
                const current = insight === open
                return (
                  <li key={group.id} className="border-b">
                    <Link
                      to="/$org/prototype/performance/$groupId"
                      params={{ org, groupId: String(group.id) }}
                      search={{ variant }}
                      onClick={(event) => {
                        if (!isDesktop()) return
                        event.preventDefault()
                        go({ group: String(group.id) })
                      }}
                      aria-current={current ? 'true' : undefined}
                      className={cn('block px-3 py-2.5 md:px-4', current ? 'lg:bg-selected' : 'hover:bg-accent/60')}
                    >
                      <span className="flex items-baseline gap-3">
                        <Name group={group} className="break-words lg:truncate" />
                        <span className="mono ml-auto shrink-0 font-semibold tabular-nums">
                          {measure === Measure.time ? formatMs(insight.totalTime) : measure === Measure.duration ? formatMs(group.p95 ?? 0) : compact(group.count)}
                        </span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-3">
                        {measure === Measure.duration ? (
                          <DurationBar p50={group.p50 ?? 0} p95={group.p95 ?? 0} className="flex-1" />
                        ) : (
                          <span className="relative h-1.5 flex-1 border-b border-grid" aria-hidden>
                            <span
                              className="absolute bottom-0 left-0 h-1.5 bg-foreground/55"
                              style={{ width: `${Math.max(0.5, (measure === Measure.time ? insight.share / peakShare : group.count / peakCount) * 100)}%` }}
                            />
                          </span>
                        )}
                        <span className="mono w-16 shrink-0 text-right text-muted-foreground tabular-nums">
                          {measure === Measure.time ? formatPercent(insight.share * 100) : measure === Measure.duration ? '' : 'req'}
                        </span>
                      </span>
                      <span className="mono mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
                        {measure !== Measure.requests && <span>{compact(group.count)} req</span>}
                        <span>typical {formatMs(group.p50 ?? 0)}</span>
                        {measure !== Measure.duration && <span>slow {formatMs(group.p95 ?? 0)}</span>}
                        {measure !== Measure.time && <span>total {formatMs(insight.totalTime)}</span>}
                        <span>{insight.project}</span>
                      </span>
                      <Problems insight={insight} since={insight.slower && releaseAt(marks, axis, insight.slower.since)} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
          {open && (
            <aside className="sticky top-11 hidden h-[calc(100dvh-2.75rem)] min-w-0 flex-1 overflow-y-auto lg:block" aria-label="Transaction">
              <PaneD org={org} groupId={String(open.group.id)} key={open.group.id} />
            </aside>
          )}
        </div>
      )}
    </>
  )
}

// Seven days on the shared time axis, releases named above their marks. The latest day of a transaction
// that got slower is drawn in the spiking colour, as in the inbox.
function WeekChart({ buckets, marks, axis, slower, height }: { buckets: number[]; marks: Mark[]; axis: Axis; slower: boolean; height: number }) {
  return (
    <div className="relative mt-2 pt-5">
      {marks.map((mark) => (
        <span key={mark.at} className={cn('absolute top-0 font-mono text-xs whitespace-nowrap text-brand', mark.at > 0.8 ? '-translate-x-full pr-1' : 'pl-1')} style={{ left: `${mark.at * 100}%` }}>
          {mark.label}
        </span>
      ))}
      <Trace buckets={buckets} marks={marks} height={height} trend={slower ? Trend.spiking : Trend.ongoing} />
      <div className="mono mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{dayLabel(axis.start)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

const SHADES = ['bg-foreground/75', 'bg-foreground/50', 'bg-foreground/30']
const kindOf = (op: string) => op.split('.')[0]!

// The share of an average request spent in each span group, largest first. It is a split, not a timeline:
// the backend keeps no order for spans.
function RequestSplit({ rows, outside, total, kind }: { rows: SpanRow[]; outside: number; total: number; kind?: string }) {
  return (
    <div className="flex h-7 w-full gap-px" role="img" aria-label="Average request by span, largest first">
      {rows.map((row, index) => (
        <span
          key={`${row.op} ${row.description}`}
          className={cn(
            'mono grid min-w-0.5 place-items-center overflow-hidden text-xs',
            row.repeats ? 'bg-trend-spiking text-background' : cn(SHADES[index % SHADES.length], index % SHADES.length === 2 ? 'text-foreground' : 'text-background'),
            kind && kindOf(row.op) !== kind && 'opacity-25',
          )}
          style={{ width: `${(row.time / total) * 100}%` }}
        >
          {row.time / total > 0.05 ? index + 1 : ''}
        </span>
      ))}
      {outside > 0 && <span className="min-w-0.5 border border-dashed border-border" style={{ width: `${(outside / total) * 100}%` }} />}
    </div>
  )
}

export function PaneD({ org, groupId }: { org: string; groupId: string }) {
  const { detail, axis, marks, project, missing, loading } = useGroupDetail(org, groupId)
  const [kind, setKind] = useState<string>()
  if (missing) return <Screen title="This transaction no longer exists" />
  if (loading || !detail) return <SkeletonRows rows={6} />
  const { group, request, time, slower } = detail
  const rows = [...request.rows].sort((a, b) => b.time - a.time)
  const kinds = [...new Set(rows.map((row) => kindOf(row.op)))]
  const since = slower && releaseAt(marks, axis, slower.since)
  return (
    <div className="px-3 py-4 md:px-5">
      <h1 className="mono text-lg font-medium break-words">
        <span className="font-semibold">{group.method || group.op}</span> <Breakable text={group.transaction} />
      </h1>
      <p className="mono mt-1 text-muted-foreground">{project}</p>
      <dl className="mono mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-muted-foreground">
        <dt className="label-caps">All time</dt>
        {[
          ['typical', formatMs(group.p50 ?? 0)],
          ['slow', formatMs(group.p95 ?? 0)],
          ['average', formatMs(group.avgDuration)],
          ['requests', compact(group.count)],
        ].map(([label, value]) => (
          <dd key={label} className="flex gap-1.5">
            {label} <span className="text-foreground">{value}</span>
          </dd>
        ))}
        <dd className="flex gap-1.5">
          failed <span className={group.errorRate >= 5 ? 'text-destructive' : 'text-foreground'}>{formatPercent(group.errorRate)}</span>
        </dd>
      </dl>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-3">
        <SectionLabel>Span time per request, 7 days</SectionLabel>
        {slower ? (
          <span className="flex items-center gap-1 text-sm">
            <TrendingUp className="size-3.5 text-trend-spiking" />
            <span className="mono font-semibold">{slower.factor.toFixed(1)}×</span> slower{since ? ` since ${since}` : ''}
          </span>
        ) : (
          <span className="mono text-muted-foreground">peak {formatMs(Math.max(...time))}</span>
        )}
      </div>
      <WeekChart buckets={time} marks={marks} axis={axis} slower={!!slower} height={56} />

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <SectionLabel>Average request by span, 7 days</SectionLabel>
        <span className="mono font-semibold">{formatMs(request.inSpans)}</span>
      </div>
      <div className="mt-2">
        <RequestSplit rows={rows} outside={request.outside} total={request.total} kind={kind} />
      </div>
      {kinds.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Kind">
          {[undefined, ...kinds].map((item) => (
            <button
              key={item ?? 'all'}
              type="button"
              aria-pressed={item === kind}
              onClick={() => setKind(item)}
              className={cn('mono h-7 cursor-pointer border px-2 max-lg:h-9 max-lg:px-3', item === kind ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground')}
            >
              {item ?? 'all'}
            </button>
          ))}
        </div>
      )}
      <ol className="mt-3 border-t">
        {rows.map((row, index) =>
          kind && kindOf(row.op) !== kind ? null : (
            <li key={`${row.op} ${row.description}`} className={cn('grid grid-cols-[24px_minmax(0,1fr)_auto] gap-x-2 border-b px-2 py-2', row.repeats && 'bg-hit')}>
              <span className="mono text-muted-foreground tabular-nums">{index + 1}</span>
              <span className="min-w-0">
                <span className="mono block break-words">
                  <span className="text-muted-foreground">{row.op}</span> <Breakable text={row.description} />
                </span>
                <span className="mono mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
                  {row.repeats ? (
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Repeat className="size-3" />
                      {formatTimes(row.times)} per request
                    </span>
                  ) : (
                    <span>{formatTimes(row.times)} per request</span>
                  )}
                  <span>{formatMs(row.avgDuration)} each</span>
                  <span>slow {formatMs(row.p95Duration)}</span>
                </span>
              </span>
              <span className="mono text-right tabular-nums">
                <span className="block font-semibold">{formatMs(row.time)}</span>
                <span className="text-muted-foreground">{formatPercent((row.time / request.total) * 100)}</span>
              </span>
            </li>
          ),
        )}
        {request.outside > 0 && !kind && (
          <li className="grid grid-cols-[24px_minmax(0,1fr)_auto] gap-x-2 border-b px-2 py-2 text-muted-foreground">
            <span />
            <span className="text-sm">
              Not in a span, of the <span className="mono">{formatMs(group.avgDuration)}</span> all-time average
            </span>
            <span className="mono text-right tabular-nums">{formatMs(request.outside)}</span>
          </li>
        )}
      </ol>
    </div>
  )
}

// On a phone the transaction is a page of its own.
export function DetailD({ org, groupId }: { org: string; groupId: string }) {
  return (
    <>
      <PageBar>
        <Link to="/$org/prototype/performance" params={{ org }} search={{ variant, group: groupId }} className="flex h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Performance
        </Link>
      </PageBar>
      <div className="mx-auto w-full max-w-3xl">
        <PaneD org={org} groupId={groupId} />
      </div>
    </>
  )
}

const MAX_TICKS = 60

function RepeatDetail({ org, pattern, insight }: { org: string; pattern: NPlusOnePattern; insight?: Insight }) {
  const navigate = useNavigate()
  const perRequest = pattern.spansPerTxn * pattern.avgDuration
  const average = Math.max(insight?.group.avgDuration ?? perRequest, perRequest)
  const ticks = Math.min(MAX_TICKS, Math.round(pattern.spansPerTxn))
  return (
    <div className="px-3 py-5 md:px-5">
      <SectionLabel>Query that repeats, 7 days</SectionLabel>
      <h1 className="mt-1 font-mono text-2xl font-medium lg:text-3xl">{formatTimes(pattern.spansPerTxn)} per request</h1>
      <p className="mono mt-2 break-words text-muted-foreground">
        in{' '}
        <span className="text-foreground">
          {insight ? `${insight.group.method || insight.group.op} ` : ''}
          <Breakable text={pattern.transactionName} />
        </span>
        {insight?.project ? ` · ${insight.project}` : ''}
      </p>
      <pre className="mono mt-4 border bg-code p-3 break-words whitespace-pre-wrap">{pattern.description}</pre>
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-3">
        <SectionLabel>One request</SectionLabel>
        <span className="mono">
          <span className="font-semibold">{formatMs(perRequest)}</span> of the {formatMs(average)} all-time average
        </span>
      </div>
      <div className="mt-2 flex h-7 border border-dashed border-border" role="img" aria-label={`${formatMs(perRequest)} of ${formatMs(average)} in this query`}>
        <span className="flex gap-px" style={{ width: `${(perRequest / average) * 100}%` }}>
          {Array.from({ length: ticks }, (_, index) => (
            <span key={index} className="min-w-px flex-1 bg-trend-spiking" />
          ))}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Stat label="Each run">{formatMs(pattern.avgDuration)}</Stat>
        <Stat label="Per request">{formatMs(perRequest)}</Stat>
        <Stat label="Requests">{compact(pattern.transactionCount)}</Stat>
        <Stat label="Total">{formatMs(pattern.totalTime)}</Stat>
      </dl>
      {insight && (
        <Button asChild variant="default" className="mt-6 max-lg:h-11 max-lg:w-full">
          <Link
            to="/$org/prototype/performance/$groupId"
            params={{ org, groupId: String(insight.group.id) }}
            search={{ variant }}
            onClick={(event) => {
              if (!isDesktop()) return
              event.preventDefault()
              void navigate({ to: '/$org/prototype/performance', params: { org }, search: { variant, group: String(insight.group.id) } })
            }}
          >
            Open transaction
            <ChevronRight />
          </Link>
        </Button>
      )}
    </div>
  )
}

// The repeated-queries view: one row per query, as the backend reports them, with the picked one beside the list.
export function RepeatsD({ org, search }: { org: string; search: PerformanceSearch }) {
  const { insights, patterns, loading } = useInsights(org, {})
  const picked = search.pattern !== undefined
  const pattern = patterns[search.pattern ?? 0]
  const of = (item: NPlusOnePattern) => insights.find((insight) => insight.group.transaction === item.transactionName)
  return (
    <>
      <PageBar className="max-lg:h-auto max-lg:py-2">
        {picked ? (
          <Link to="/$org/prototype/performance/n-plus-one" params={{ org }} search={{ variant }} className="flex h-9 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden">
            <ChevronLeft className="size-4" />
            Repeated queries
          </Link>
        ) : null}
        <span className={cn(picked && 'max-lg:hidden')}>
          <Views org={org} search={search} insights={insights} patterns={patterns.length} repeats />
        </span>
      </PageBar>
      {loading ? (
        <SkeletonRows />
      ) : !pattern ? (
        <Screen title="No queries repeat in the last 7 days" />
      ) : (
        <div className="flex flex-1 items-start">
          <div className={cn('min-w-0 flex-1 lg:max-w-[46%] lg:border-r', picked && 'max-lg:hidden')}>
            <div className="flex items-end justify-between gap-4 border-b px-3 py-1.5 md:px-4">
              <span className="label-caps">Runs per request, 7 days</span>
              <span className="label-caps text-right">Per request</span>
            </div>
            <ul>
              {patterns.map((item, index) => {
                const insight = of(item)
                const current = item === pattern
                return (
                  <li key={`${item.transactionName} ${item.description}`} className="border-b">
                    <Link
                      to="/$org/prototype/performance/n-plus-one"
                      params={{ org }}
                      search={{ variant, pattern: index }}
                      replace
                      aria-current={current ? 'true' : undefined}
                      className={cn('grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 md:px-4', current ? 'lg:bg-selected' : 'hover:bg-accent/60')}
                    >
                      <span className="font-mono text-xl font-medium tabular-nums">{formatTimes(item.spansPerTxn)}</span>
                      <span className="min-w-0">
                        <span className="mono line-clamp-2 break-words">{item.description}</span>
                        <span className="mono mt-0.5 block break-words text-muted-foreground">
                          in {insight ? `${insight.group.method || insight.group.op} ` : ''}
                          <Breakable text={item.transactionName} />
                        </span>
                      </span>
                      <span className="mono text-right font-semibold tabular-nums">{formatMs(item.spansPerTxn * item.avgDuration)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
          <aside className={cn('min-w-0 flex-1 lg:sticky lg:top-11 lg:h-[calc(100dvh-2.75rem)] lg:overflow-y-auto', !picked && 'max-lg:hidden')} aria-label="Query">
            <RepeatDetail org={org} pattern={pattern} insight={of(pattern)} key={pattern.description + pattern.transactionName} />
          </aside>
        </div>
      )}
    </>
  )
}
