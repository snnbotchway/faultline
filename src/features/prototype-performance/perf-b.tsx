// PROTOTYPE, throwaway. Variant B, "Time spent": transactions ranked by the total time they cost, with what
// is wrong named on the row. The transaction opens beside the list as an average request split by span.
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, CircleAlert, Repeat, TrendingUp } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { compact } from '@/features/issues/format'
import { ReleaseTrace } from '@/features/issues/trace'
import { useHotkeys } from '@/lib/hotkeys'
import { cn } from '@/lib/utils'
import {
  Flag,
  GroupName,
  SectionLabel,
  SkeletonRows,
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

const variant = Variant.B
const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches

const FLAGS = [
  { flag: Flag.repeats, label: 'Repeated queries', test: (insight: Insight) => insight.patterns.length > 0 },
  { flag: Flag.slower, label: 'Slower this week', test: (insight: Insight) => !!insight.slower },
  { flag: Flag.failing, label: 'Failing', test: (insight: Insight) => insight.failing },
]

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

export function ListB({ org, search, flag = search.flag }: { org: string; search: PerformanceSearch; flag?: Flag }) {
  const navigate = useNavigate()
  const { insights, axis, marks, loading } = useInsights(org, { query: search.query })
  const ranked = [...insights].sort((a, b) => b.totalTime - a.totalTime)
  const test = FLAGS.find((item) => item.flag === flag)?.test
  const rows = test ? ranked.filter(test) : ranked
  const open = rows.find((row) => String(row.group.id) === search.group) ?? rows[0]
  const peak = ranked[0]?.share ?? 1
  const go = (patch: Partial<PerformanceSearch>) => void navigate({ to: '/$org/prototype/performance', params: { org }, search: { variant, query: search.query, flag, group: search.group, ...patch }, replace: true })
  const move = (step: number) => {
    const index = rows.findIndex((row) => row === open)
    const next = rows[Math.max(0, Math.min(rows.length - 1, index + step))]
    if (next) go({ group: String(next.group.id) })
  }
  useHotkeys({ j: () => move(1), k: () => move(-1) })
  return (
    <>
      <PageBar className="max-lg:h-auto max-lg:flex-col max-lg:items-stretch max-lg:gap-0 max-lg:px-0">
        <span className="shrink-0 font-semibold max-lg:flex max-lg:h-11 max-lg:items-center max-lg:px-3">Performance</span>
        <div className="flex items-center gap-1 overflow-x-auto max-lg:px-3 max-lg:pb-2" role="group" aria-label="Show">
          {[{ flag: undefined, label: 'All', test: () => true }, ...FLAGS].map((item) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={item.flag === flag}
              onClick={() => go({ flag: item.flag, group: undefined })}
              className={cn('flex h-7 shrink-0 cursor-pointer items-center gap-1.5 border px-2.5 text-sm max-lg:h-9', item.flag === flag ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent')}
            >
              {item.label}
              <span className={cn('mono', item.flag !== flag && 'text-muted-foreground')}>{ranked.filter(item.test).length}</span>
            </button>
          ))}
        </div>
      </PageBar>
      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <Screen title="No transactions yet" />
      ) : (
        <div className="flex flex-1 items-start">
          <div className="min-w-0 flex-1 lg:max-w-[46%] lg:border-r">
            <div className="flex items-baseline justify-between border-b px-3 py-1.5 md:px-4">
              <span className="label-caps">Share of all time spent</span>
              <span className="label-caps">Total</span>
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
                        <GroupName group={group} className="truncate max-lg:whitespace-normal max-lg:break-all" />
                        <span className="mono ml-auto shrink-0 font-semibold tabular-nums">{formatMs(insight.totalTime)}</span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-3">
                        <span className="relative h-1.5 flex-1 border-b border-grid" aria-hidden>
                          <span className="absolute bottom-0 left-0 h-1.5 bg-foreground/55" style={{ width: `${Math.max(0.5, (insight.share / peak) * 100)}%` }} />
                        </span>
                        <span className="mono w-10 shrink-0 text-right text-muted-foreground tabular-nums">{formatPercent(insight.share * 100)}</span>
                      </span>
                      <span className="mono mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
                        <span>{compact(group.count)} req</span>
                        <span>typical {formatMs(group.p50 ?? 0)}</span>
                        <span>slow {formatMs(group.p95 ?? 0)}</span>
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
              <PaneB org={org} groupId={String(open.group.id)} key={open.group.id} />
            </aside>
          )}
        </div>
      )}
    </>
  )
}

const SHADES = ['bg-foreground/75', 'bg-foreground/50', 'bg-foreground/30']

// One average request, left to right: the time in each span group, then the time outside any span.
function RequestStrip({ rows, outside, total }: { rows: SpanRow[]; outside: number; total: number }) {
  return (
    <div className="flex h-7 w-full gap-px" role="img" aria-label="Average request by span">
      {rows.map((row, index) => (
        <span
          key={`${row.op} ${row.description}`}
          className={cn('mono grid min-w-0.5 place-items-center overflow-hidden text-xs', row.repeats ? 'bg-trend-spiking text-background' : cn(SHADES[index % SHADES.length], index % SHADES.length === 2 ? 'text-foreground' : 'text-background'))}
          style={{ width: `${(row.time / total) * 100}%` }}
        >
          {row.time / total > 0.05 ? index + 1 : ''}
        </span>
      ))}
      {outside > 0 && <span className="min-w-0.5 border border-dashed border-border" style={{ width: `${(outside / total) * 100}%` }} />}
    </div>
  )
}

export function PaneB({ org, groupId, page }: { org: string; groupId: string; page?: boolean }) {
  const { detail, axis, marks, project, missing, loading } = useGroupDetail(org, groupId)
  const hit = useRef<HTMLLIElement>(null)
  const ready = !!detail
  useEffect(() => {
    if (ready && !page) hit.current?.scrollIntoView({ block: 'nearest' })
  }, [ready, page])
  if (missing) return <Screen title="This transaction no longer exists" />
  if (loading || !detail) return <SkeletonRows rows={6} />
  const { group, request, time, slower } = detail
  const rows = [...request.rows].sort((a, b) => b.time - a.time)
  const since = slower && releaseAt(marks, axis, slower.since)
  const firstRepeat = rows.findIndex((row) => row.repeats)
  return (
    <div className="px-3 py-4 md:px-5">
      <h1 className="mono text-lg font-medium break-all">
        <span className="font-semibold">{group.method || group.op}</span> {group.transaction}
      </h1>
      <dl className="mono mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
        <div className="flex gap-1.5">
          <dt>typical</dt>
          <dd className="text-foreground">{formatMs(group.p50 ?? 0)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>slow</dt>
          <dd className="text-foreground">{formatMs(group.p95 ?? 0)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>requests</dt>
          <dd className="text-foreground">{compact(group.count)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>failed</dt>
          <dd className={group.errorRate >= 5 ? 'text-destructive' : 'text-foreground'}>{formatPercent(group.errorRate)}</dd>
        </div>
        <div>{project}</div>
      </dl>

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <SectionLabel>Average request</SectionLabel>
        <span className="mono font-semibold">{formatMs(request.total)}</span>
      </div>
      <div className="mt-2">
        <RequestStrip rows={rows} outside={request.outside} total={request.total} />
      </div>
      <ol className="mt-3 border-t">
        {rows.map((row, index) => (
          <li key={`${row.op} ${row.description}`} ref={index === firstRepeat ? hit : undefined} className={cn('grid grid-cols-[24px_minmax(0,1fr)_auto] gap-x-2 border-b px-2 py-2', row.repeats && 'bg-hit')}>
            <span className="mono text-muted-foreground tabular-nums">{index + 1}</span>
            <span className="min-w-0">
              <span className="mono block break-words" title={row.description}>
                <span className="text-muted-foreground">{row.op}</span> {row.description}
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
        ))}
        {request.outside > 0 && (
          <li className="grid grid-cols-[24px_minmax(0,1fr)_auto] gap-x-2 border-b px-2 py-2 text-muted-foreground">
            <span />
            <span className="text-sm">Outside any span</span>
            <span className="mono text-right tabular-nums">
              <span className="block">{formatMs(request.outside)}</span>
              {formatPercent((request.outside / request.total) * 100)}
            </span>
          </li>
        )}
      </ol>

      <div className="mt-6 flex items-baseline justify-between gap-3">
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
      <ReleaseTrace buckets={time} marks={marks} height={56} className="mt-2" />
    </div>
  )
}

// On a phone the transaction is a page of its own.
export function DetailB({ org, groupId }: { org: string; groupId: string }) {
  return (
    <>
      <PageBar>
        <Link to="/$org/prototype/performance" params={{ org }} search={{ variant, group: groupId }} className="flex h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Performance
        </Link>
      </PageBar>
      <div className="mx-auto w-full max-w-3xl">
        <PaneB org={org} groupId={groupId} page />
      </div>
    </>
  )
}
