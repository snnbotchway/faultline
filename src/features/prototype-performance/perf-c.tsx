// PROTOTYPE, throwaway. Variant C, "Findings": the page opens on what is wrong (queries that repeat,
// transactions that got slower, requests that fail), each a row that leads to its evidence. The full list
// sits beside the findings. A transaction reads as a report: what changed, then where the time goes.
import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight, Repeat, Search } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { NPlusOnePattern } from '@/api/performance'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { compact } from '@/features/issues/format'
import { ReleaseTrace, Trace } from '@/features/issues/trace'
import { Trend } from '@/features/issues/trend'
import { cn } from '@/lib/utils'
import {
  DurationBar,
  DurationScale,
  GroupName,
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

const variant = Variant.C
const FINDING = 'grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 hover:bg-accent/60 md:px-4 lg:grid-cols-[80px_minmax(0,1fr)_auto]'
const FIGURE = 'font-mono text-xl font-medium tabular-nums'

function Section({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  if (count === 0) return null
  return (
    <section>
      <div className="flex items-baseline gap-2 border-b bg-background px-3 pt-5 pb-1.5 md:px-4">
        <SectionLabel>{label}</SectionLabel>
        <span className="mono text-muted-foreground">{count}</span>
      </div>
      <ul>{children}</ul>
    </section>
  )
}

function RepeatFinding({ org, pattern, index, insight, current }: { org: string; pattern: NPlusOnePattern; index: number; insight?: Insight; current?: boolean }) {
  return (
    <li className="border-b">
      <Link
        to="/$org/prototype/performance/n-plus-one"
        params={{ org }}
        search={{ variant, pattern: index }}
        aria-current={current ? 'true' : undefined}
        className={cn(FINDING, current && 'lg:bg-selected')}
      >
        <span className={FIGURE}>{formatTimes(pattern.spansPerTxn)}</span>
        <span className="min-w-0">
          <span className="mono line-clamp-2 break-words">{pattern.description}</span>
          <span className="mono mt-0.5 block truncate text-muted-foreground">
            in {insight ? `${insight.group.method || insight.group.op} ` : ''}
            {pattern.transactionName}
          </span>
        </span>
        <span className="mono text-right tabular-nums">
          <span className="block font-semibold">{formatMs(pattern.spansPerTxn * pattern.avgDuration)}</span>
          <span className="text-muted-foreground">per request</span>
        </span>
      </Link>
    </li>
  )
}

function Findings({ org, insights, patterns, axis, marks }: Pick<ReturnType<typeof useInsights>, 'insights' | 'patterns' | 'axis' | 'marks'> & { org: string }) {
  const slower = insights.filter((insight) => insight.slower).sort((a, b) => b.slower!.factor - a.slower!.factor)
  const failing = insights.filter((insight) => insight.failing).sort((a, b) => b.group.errorRate - a.group.errorRate)
  if (patterns.length + slower.length + failing.length === 0) return <Screen title="Nothing stands out in the last 7 days" />
  const link = (insight: Insight) => ({ to: '/$org/prototype/performance/$groupId', params: { org, groupId: String(insight.group.id) }, search: { variant } }) as const
  return (
    <>
      <Section label="Queries that repeat" count={patterns.length}>
        {patterns.map((pattern, index) => (
          <RepeatFinding key={`${pattern.transactionName} ${pattern.description}`} org={org} pattern={pattern} index={index} insight={insights.find((insight) => insight.group.transaction === pattern.transactionName)} />
        ))}
      </Section>
      <Section label="Slower this week" count={slower.length}>
        {slower.map((insight) => {
          const since = releaseAt(marks, axis, insight.slower!.since)
          return (
            <li key={insight.group.id} className="border-b">
              <Link {...link(insight)} className={FINDING}>
                <span className={FIGURE}>{insight.slower!.factor.toFixed(1)}×</span>
                <span className="min-w-0">
                  <GroupName group={insight.group} className="block truncate max-lg:whitespace-normal max-lg:break-all" />
                  <span className="mono mt-0.5 block text-muted-foreground">{since ? `since ${since}` : 'in the last 2 days'}</span>
                </span>
                <Trace buckets={insight.days} marks={marks} height={28} trend={Trend.spiking} className="w-24 lg:w-36" />
              </Link>
            </li>
          )
        })}
      </Section>
      <Section label="Failing" count={failing.length}>
        {failing.map((insight) => (
          <li key={insight.group.id} className="border-b">
            <Link {...link(insight)} className={FINDING}>
              <span className={cn(FIGURE, 'text-destructive')}>{formatPercent(insight.group.errorRate)}</span>
              <span className="min-w-0">
                <GroupName group={insight.group} className="block truncate max-lg:whitespace-normal max-lg:break-all" />
                <span className="mono mt-0.5 block text-muted-foreground">
                  {compact(insight.group.errorCount)} of {compact(insight.group.count)} requests
                </span>
              </span>
              <span />
            </Link>
          </li>
        ))}
      </Section>
    </>
  )
}

export function ListC({ org, search }: { org: string; search: PerformanceSearch }) {
  const navigate = useNavigate()
  const data = useInsights(org, { query: search.query })
  const [text, setText] = useState(search.query ?? '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void navigate({ to: '/$org/prototype/performance', params: { org }, search: { variant, query: text.trim() || undefined } })
  }
  const slowest = [...data.insights].sort((a, b) => (b.group.p95 ?? 0) - (a.group.p95 ?? 0))
  return (
    <>
      <PageBar>
        <span className="shrink-0 font-semibold">Performance</span>
        <span className="mono text-muted-foreground max-lg:hidden">last 7 days</span>
        <form onSubmit={submit} role="search" className="ml-auto flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-2.5 focus-within:border-brand max-lg:h-9 lg:max-w-xs">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input value={text} onChange={(event) => setText(event.target.value)} aria-label="Search transactions" spellCheck={false} autoCapitalize="off" className="mono h-full min-w-0 flex-1 bg-transparent outline-none max-lg:text-[1rem]" />
        </form>
      </PageBar>
      {data.loading ? (
        <SkeletonRows />
      ) : data.insights.length === 0 ? (
        <Screen title={search.query ? 'No transactions match this search' : 'No transactions yet'} />
      ) : (
        <div className="grid flex-1 items-start lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
          <div className="min-w-0 lg:min-h-full lg:border-r">
            <Findings org={org} {...data} />
          </div>
          <section className="min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_72px] items-end gap-x-4 border-b px-3 pt-5 pb-1.5 md:px-4 lg:grid-cols-[minmax(0,1fr)_200px_72px]">
              <SectionLabel>All transactions, slowest first</SectionLabel>
              <DurationScale className="max-lg:hidden" />
              <span className="label-caps text-right">Slow</span>
            </div>
            <ul>
              {slowest.map(({ group, project }) => (
                <li key={group.id} className="border-b">
                  <Link
                    to="/$org/prototype/performance/$groupId"
                    params={{ org, groupId: String(group.id) }}
                    search={{ variant }}
                    className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-x-4 px-3 py-2 hover:bg-accent/60 md:px-4 lg:grid-cols-[minmax(0,1fr)_200px_72px]"
                  >
                    <span className="min-w-0">
                      <GroupName group={group} className="block truncate" />
                      <span className="mono mt-0.5 block truncate text-muted-foreground">
                        {project} · {compact(group.count)} req · typical {formatMs(group.p50 ?? 0)}
                      </span>
                    </span>
                    <DurationBar p50={group.p50 ?? 0} p95={group.p95 ?? 0} className="max-lg:hidden" />
                    <span className="mono text-right font-semibold tabular-nums">{formatMs(group.p95 ?? 0)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  )
}

const MAX_TICKS = 60

// One span group in the average request. A span that runs many times is drawn as that many strokes.
function CascadeBar({ row, offset, total }: { row: SpanRow; offset: number; total: number }) {
  const ticks = Math.min(MAX_TICKS, Math.round(row.times))
  return (
    <span className="relative block h-4 border-b border-grid" aria-hidden>
      <span className="absolute inset-y-0 flex gap-px" style={{ left: `${(offset / total) * 100}%`, width: `${Math.max(0.4, (row.time / total) * 100)}%` }}>
        {row.repeats ? (
          Array.from({ length: ticks }, (_, index) => <span key={index} className="min-w-px flex-1 bg-trend-spiking" />)
        ) : (
          <span className="flex-1 bg-foreground/55" />
        )}
      </span>
    </span>
  )
}

const CASCADE = 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_72px_80px_20px]'

function Cascade({ rows, outside, total }: { rows: SpanRow[]; outside: number; total: number }) {
  const [open, setOpen] = useState<string>()
  const ordered = [...rows].sort((a, b) => b.time - a.time)
  let offset = 0
  return (
    <>
      <div className={cn('hidden items-end gap-x-4 border-b px-4 py-1.5 lg:grid', CASCADE)}>
        <span className="label-caps">Span, largest first</span>
        <span className="mono flex justify-between text-xs text-muted-foreground" aria-hidden>
          <span>0</span>
          <span>{formatMs(total / 2)}</span>
          <span>{formatMs(total)}</span>
        </span>
        <span className="label-caps text-right">Runs</span>
        <span className="label-caps text-right">Time</span>
        <span />
      </div>
      <ul>
        {ordered.map((row) => {
          const key = `${row.op} ${row.description}`
          const start = offset
          offset += row.time
          const unfolded = open === key
          return (
            <li key={key} className={cn('border-b', row.repeats && 'bg-hit')}>
              <button
                type="button"
                aria-expanded={unfolded}
                onClick={() => setOpen(unfolded ? undefined : key)}
                className={cn('grid w-full cursor-pointer items-center gap-x-4 gap-y-1.5 px-3 py-2 text-left md:px-4', CASCADE, !row.repeats && 'hover:bg-accent/60')}
              >
                <span className="mono min-w-0 truncate">
                  <span className="text-muted-foreground">{row.op}</span> {row.description}
                </span>
                <CascadeBar row={row} offset={start} total={total} />
                <span className={cn('mono text-right tabular-nums max-lg:hidden', row.repeats && 'font-semibold')}>{formatTimes(row.times)}</span>
                <span className="mono text-right font-semibold tabular-nums max-lg:hidden">{formatMs(row.time)}</span>
                <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-150 max-lg:hidden', unfolded && 'rotate-180')} />
                <span className="mono flex gap-x-3 text-muted-foreground lg:hidden">
                  <span className={cn(row.repeats && 'flex items-center gap-1 font-semibold text-foreground')}>
                    {row.repeats && <Repeat className="size-3" />}
                    {formatTimes(row.times)} per request
                  </span>
                  <span className="ml-auto font-semibold text-foreground">{formatMs(row.time)}</span>
                </span>
              </button>
              {unfolded && (
                <div className="px-3 pb-3 md:px-4">
                  <pre className="mono overflow-x-auto border bg-code p-3 whitespace-pre-wrap break-words">{row.description}</pre>
                  <dl className="mono mt-2 flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
                    <div className="flex gap-1.5">
                      <dt>each</dt>
                      <dd className="text-foreground">{formatMs(row.avgDuration)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>slow</dt>
                      <dd className="text-foreground">{formatMs(row.p95Duration)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>runs this week</dt>
                      <dd className="text-foreground">{compact(row.count)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>share of request</dt>
                      <dd className="text-foreground">{formatPercent((row.time / total) * 100)}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </li>
          )
        })}
        {outside > 0 && (
          <li className={cn('grid items-center gap-x-4 gap-y-1.5 border-b px-3 py-2 text-muted-foreground md:px-4', CASCADE)}>
            <span className="text-sm">Outside any span</span>
            <span className="relative block h-4 border-b border-grid" aria-hidden>
              <span className="absolute inset-y-0 border border-dashed border-border" style={{ left: `${(offset / total) * 100}%`, right: 0 }} />
            </span>
            <span className="max-lg:hidden" />
            <span className="mono text-right tabular-nums">{formatMs(outside)}</span>
            <span className="max-lg:hidden" />
          </li>
        )}
      </ul>
    </>
  )
}

export function DetailC({ org, groupId }: { org: string; groupId: string }) {
  const { detail, axis, marks, project, missing, loading } = useGroupDetail(org, groupId)
  const bar = (
    <PageBar>
      <Link to="/$org/prototype/performance" params={{ org }} search={{ variant }} className="flex h-11 shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Performance
      </Link>
    </PageBar>
  )
  if (missing) return <>{bar}<Screen title="This transaction no longer exists" /></>
  if (loading || !detail) return <>{bar}<SkeletonRows /></>
  const { group, request, time, slower } = detail
  const since = slower && releaseAt(marks, axis, slower.since)
  const repeats = request.rows.filter((row) => row.repeats)
  const repeated = repeats.reduce((sum, row) => sum + row.time, 0)
  return (
    <>
      {bar}
      <div className="mx-auto w-full max-w-5xl lg:border-x">
        <header className="border-b px-3 py-5 md:px-4">
          <h1 className="mono text-lg font-medium break-all lg:text-xl">
            <span className="font-semibold">{group.method || group.op}</span> {group.transaction}
          </h1>
          <p className="mono mt-1 text-muted-foreground">
            {project} · {group.op}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Stat label="Typical">{formatMs(group.p50 ?? 0)}</Stat>
            <Stat label="Slow">{formatMs(group.p95 ?? 0)}</Stat>
            <Stat label="Requests">{compact(group.count)}</Stat>
            <Stat label="Failed" className={cn(group.errorRate >= 5 && 'text-destructive')}>
              {formatPercent(group.errorRate)}
            </Stat>
          </dl>
        </header>
        <section className="border-b px-3 py-4 md:px-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <SectionLabel>Span time per request, 7 days</SectionLabel>
            {slower ? (
              <span className="text-sm">
                <span className="mono font-semibold">{slower.factor.toFixed(1)}×</span> slower{since ? ` since ${since}` : ' in the last 2 days'}
              </span>
            ) : (
              <span className="mono text-muted-foreground">peak {formatMs(Math.max(...time))}</span>
            )}
          </div>
          <ReleaseTrace buckets={time} marks={marks} height={88} className="mt-2" />
          <div className="mono mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{new Date(axis.start * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            <span>Today</span>
          </div>
        </section>
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 pt-4 pb-2 md:px-4">
            <SectionLabel>Average request</SectionLabel>
            {repeats.length > 0 ? (
              <span className="flex items-center gap-1.5 text-sm">
                <Repeat className="size-3.5 text-trend-spiking" />
                <span className="mono font-semibold">{formatMs(repeated)}</span> of <span className="mono">{formatMs(request.total)}</span> in repeated queries
              </span>
            ) : (
              <span className="mono font-semibold">{formatMs(request.total)}</span>
            )}
          </div>
          <Cascade rows={request.rows} outside={request.outside} total={request.total} />
        </section>
      </div>
    </>
  )
}

function RepeatDetail({ org, pattern, insight }: { org: string; pattern: NPlusOnePattern; insight?: Insight }) {
  const perRequest = pattern.spansPerTxn * pattern.avgDuration
  const total = Math.max(insight?.group.avgDuration ?? perRequest, perRequest)
  const ticks = Math.min(MAX_TICKS, Math.round(pattern.spansPerTxn))
  return (
    <div className="px-3 py-5 md:px-5">
      <SectionLabel>Query that repeats</SectionLabel>
      <h1 className="mt-1 font-mono text-2xl font-medium lg:text-3xl">{formatTimes(pattern.spansPerTxn)} per request</h1>
      <p className="mono mt-2 break-all text-muted-foreground">
        in <span className="text-foreground">{insight ? `${insight.group.method || insight.group.op} ` : ''}{pattern.transactionName}</span>
        {insight?.project ? ` · ${insight.project}` : ''}
      </p>
      <pre className="mono mt-4 border bg-code p-3 whitespace-pre-wrap break-words">{pattern.description}</pre>
      <div className="mt-5 flex items-baseline justify-between gap-3">
        <SectionLabel>One request</SectionLabel>
        <span className="mono">
          <span className="font-semibold">{formatMs(perRequest)}</span> of {formatMs(total)}
        </span>
      </div>
      <div className="mt-2 flex h-7 border border-dashed border-border" role="img" aria-label={`${formatMs(perRequest)} of ${formatMs(total)} in this query`}>
        <span className="flex gap-px" style={{ width: `${(perRequest / total) * 100}%` }}>
          {Array.from({ length: ticks }, (_, index) => (
            <span key={index} className="min-w-px flex-1 bg-trend-spiking" />
          ))}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Stat label="Each run">{formatMs(pattern.avgDuration)}</Stat>
        <Stat label="Share of request">{formatPercent((perRequest / total) * 100)}</Stat>
        <Stat label="Requests">{compact(pattern.transactionCount)}</Stat>
        <Stat label="Total this week">{formatMs(pattern.totalTime)}</Stat>
      </dl>
      {insight && (
        <Button asChild variant="default" className="mt-6 max-lg:h-11 max-lg:w-full">
          <Link to="/$org/prototype/performance/$groupId" params={{ org, groupId: String(insight.group.id) }} search={{ variant }}>
            Open transaction
            <ChevronRight />
          </Link>
        </Button>
      )}
    </div>
  )
}

export function RepeatsC({ org, search }: { org: string; search: PerformanceSearch }) {
  const { insights, patterns, loading } = useInsights(org, {})
  const picked = search.pattern !== undefined
  const pattern = patterns[search.pattern ?? 0]
  const of = (item: NPlusOnePattern) => insights.find((insight) => insight.group.transaction === item.transactionName)
  return (
    <>
      <PageBar>
        <Link to="/$org/prototype/performance" params={{ org }} search={{ variant }} className="flex h-11 shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Performance
        </Link>
        {picked && (
          <Link to="/$org/prototype/performance/n-plus-one" params={{ org }} search={{ variant }} className="flex h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden">
            / Queries that repeat
          </Link>
        )}
      </PageBar>
      {loading ? (
        <SkeletonRows />
      ) : !pattern ? (
        <Screen title="No queries repeat in the last 7 days" />
      ) : (
        <div className="grid flex-1 items-start lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className={cn('min-w-0 lg:min-h-full lg:border-r', picked && 'max-lg:hidden')}>
            <Section label="Queries that repeat" count={patterns.length}>
              {patterns.map((item, index) => (
                <RepeatFinding key={`${item.transactionName} ${item.description}`} org={org} pattern={item} index={index} insight={of(item)} current={item === pattern} />
              ))}
            </Section>
          </div>
          <div className={cn('min-w-0', !picked && 'max-lg:hidden')}>
            <RepeatDetail org={org} pattern={pattern} insight={of(pattern)} />
          </div>
        </div>
      )}
    </>
  )
}
