// PROTOTYPE, throwaway. Variant A, "Ledger": the stock screens done properly. A dense sortable table,
// a page per transaction, and repeated queries and spans as tabs of their own.
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowDown, ArrowDownWideNarrow, ChevronRight, Repeat, Search } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { spanGroupsQuery, type SpanGroup, type SpanSort, type TransactionSort } from '@/api/performance'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ago, compact, exact } from '@/features/issues/format'
import { ReleaseTrace } from '@/features/issues/trace'
import { cn } from '@/lib/utils'
import {
  DurationBar,
  DurationScale,
  GroupName,
  SORTS,
  SectionLabel,
  SkeletonRows,
  Stat,
  Variant,
  formatMs,
  formatPercent,
  formatTimes,
  useGroupDetail,
  useInsights,
  type PerformanceSearch,
  type SpanRow,
} from './shared'

const variant = Variant.A
const Tab = { transactions: 'transactions', spans: 'spans', repeats: 'repeats' } as const
type Tab = (typeof Tab)[keyof typeof Tab]

function Tabs({ org, current, repeats }: { org: string; current: Tab; repeats?: number }) {
  const tab = (active: boolean) => cn('flex items-center gap-1.5 border-y-2 border-transparent text-sm font-medium whitespace-nowrap', active ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')
  return (
    <nav className="flex h-full items-stretch gap-4" aria-label="Performance">
      <Link to="/$org/prototype/performance" params={{ org }} search={{ variant }} className={tab(current === Tab.transactions)}>
        Transactions
      </Link>
      <Link to="/$org/prototype/performance" params={{ org }} search={{ variant, tab: 'spans' }} className={tab(current === Tab.spans)}>
        Spans
      </Link>
      <Link to="/$org/prototype/performance/n-plus-one" params={{ org }} search={{ variant }} className={tab(current === Tab.repeats)}>
        Repeated queries
        {repeats ? <span className="mono text-muted-foreground">{repeats}</span> : null}
      </Link>
    </nav>
  )
}

function SearchField({ value, label, onSubmit }: { value: string; label: string; onSubmit: (value: string) => void }) {
  const [text, setText] = useState(value)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(text.trim())
  }
  return (
    <form onSubmit={submit} role="search" className="flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-2.5 focus-within:border-brand max-lg:h-9 lg:max-w-sm">
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input value={text} onChange={(event) => setText(event.target.value)} aria-label={label} spellCheck={false} autoCapitalize="off" className="mono h-full min-w-0 flex-1 bg-transparent outline-none max-lg:text-[1rem]" />
    </form>
  )
}

const COLUMNS = 'lg:grid-cols-[minmax(0,1fr)_88px_88px_88px_88px_260px_80px_64px]'
const HEAD = 'label-caps text-right'

function SortHead({ label, sort, current, onSort }: { label: string; sort: TransactionSort; current: TransactionSort; onSort: (sort: TransactionSort) => void }) {
  const active = current === sort
  return (
    <button type="button" onClick={() => onSort(sort)} aria-pressed={active} className={cn(HEAD, 'flex cursor-pointer items-center justify-end gap-1 hover:text-foreground', active && 'text-foreground')}>
      {label}
      {active && <ArrowDown className="size-3" />}
    </button>
  )
}

export function ListA({ org, search }: { org: string; search: PerformanceSearch }) {
  const navigate = useNavigate()
  const { insights, patterns, loading } = useInsights(org, search)
  const sort = search.order ?? '-avg_duration'
  const go = (patch: Partial<PerformanceSearch>) => void navigate({ to: '/$org/prototype/performance', params: { org }, search: { ...search, ...patch } })
  if (search.tab === 'spans') return <SpansA org={org} search={search} repeats={patterns.length} />
  return (
    <>
      <PageBar className="max-lg:h-auto max-lg:flex-wrap max-lg:gap-x-3 max-lg:gap-y-0 max-lg:pb-2">
        <div className="flex h-11 items-stretch overflow-x-auto max-lg:w-full">
          <Tabs org={org} current={Tab.transactions} repeats={patterns.length} />
        </div>
        <SearchField value={search.query ?? ''} label="Search transactions" onSubmit={(query) => go({ query: query || undefined })} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="lg:ml-auto max-lg:h-9" aria-label="Sort">
              <ArrowDownWideNarrow />
              {SORTS.find((item) => item.value === sort)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sort} onValueChange={(value) => go({ order: SORTS.find((item) => item.value === value)?.value })}>
              {SORTS.map((item) => (
                <DropdownMenuRadioItem key={item.value} value={item.value}>
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageBar>
      <div className={cn('sticky top-11 z-10 hidden items-end gap-4 border-b bg-background px-4 py-1.5 lg:grid', COLUMNS)}>
        <span className="label-caps">Transaction</span>
        <SortHead label="Requests" sort="-count" current={sort} onSort={(next) => go({ order: next })} />
        <SortHead label="Average" sort="-avg_duration" current={sort} onSort={(next) => go({ order: next })} />
        <span className={HEAD}>Typical</span>
        <span className={HEAD}>Slow</span>
        <DurationScale />
        <span className={HEAD}>Failed</span>
        <span className={HEAD}>Seen</span>
      </div>
      {loading ? (
        <SkeletonRows />
      ) : insights.length === 0 ? (
        <Screen title={search.query ? 'No transactions match this search' : 'No transactions yet'} />
      ) : (
        <ul>
          {insights.map(({ group, project, patterns: repeated }) => (
            <li key={group.id} className="border-b">
              <Link
                to="/$org/prototype/performance/$groupId"
                params={{ org, groupId: String(group.id) }}
                search={{ variant }}
                className={cn('grid items-center gap-x-4 px-3 py-2.5 hover:bg-accent/60 md:px-4 lg:py-2', COLUMNS)}
              >
                <span className="min-w-0">
                  <GroupName group={group} className="block truncate max-lg:whitespace-normal max-lg:break-all" />
                  <span className="mono mt-0.5 flex items-center gap-2 text-muted-foreground">
                    <span className="truncate">
                      {project} · {group.op}
                    </span>
                    {repeated.length > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-foreground">
                        <Repeat className="size-3" />
                        {repeated.length} repeated
                      </span>
                    )}
                  </span>
                </span>
                <span className="mono text-right tabular-nums max-lg:hidden">{compact(group.count)}</span>
                <span className="mono text-right tabular-nums max-lg:hidden">{formatMs(group.avgDuration)}</span>
                <span className="mono text-right tabular-nums max-lg:hidden">{formatMs(group.p50 ?? 0)}</span>
                <span className="mono text-right font-semibold tabular-nums max-lg:hidden">{formatMs(group.p95 ?? 0)}</span>
                <DurationBar p50={group.p50 ?? 0} p95={group.p95 ?? 0} className="max-lg:hidden" />
                <span className={cn('mono text-right tabular-nums max-lg:hidden', group.errorRate >= 5 ? 'font-semibold text-destructive' : group.errorRate === 0 && 'text-muted-foreground')}>
                  {formatPercent(group.errorRate)}
                </span>
                <span className="mono text-right text-muted-foreground max-lg:hidden" title={exact(group.lastSeen)}>
                  {ago(group.lastSeen)}
                </span>
                <span className="mono mt-1 flex flex-wrap gap-x-3 text-muted-foreground lg:hidden">
                  <span className="text-foreground">slow {formatMs(group.p95 ?? 0)}</span>
                  <span>typical {formatMs(group.p50 ?? 0)}</span>
                  <span>{compact(group.count)} req</span>
                  {group.errorRate > 0 && <span className={cn(group.errorRate >= 5 && 'text-destructive')}>{formatPercent(group.errorRate)} failed</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

const SPAN_SORTS: { value: SpanSort; label: string }[] = [
  { value: '-total_time', label: 'Total time' },
  { value: '-avg_duration', label: 'Average' },
  { value: '-count', label: 'Count' },
]
const OPS = ['db', 'http.client', 'resource', 'ui', 'queue', 'cache']

function OpFilter({ op, onChange }: { op?: string; onChange: (op?: string) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto" role="group" aria-label="Kind">
      {[undefined, ...OPS].map((item) => (
        <button
          key={item ?? 'all'}
          type="button"
          aria-pressed={item === op}
          onClick={() => onChange(item)}
          className={cn('mono h-7 shrink-0 cursor-pointer border px-2 max-lg:h-9 max-lg:px-3', item === op ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground')}
        >
          {item ?? 'all'}
        </button>
      ))}
    </div>
  )
}

const SPAN_COLUMNS = 'lg:grid-cols-[128px_minmax(0,1fr)_80px_88px_88px_96px_120px]'

function SpanTable({ rows, head }: { rows: { span: SpanGroup; times?: number; repeats?: boolean; share: number }[]; head: ReactNode }) {
  return (
    <>
      <div className={cn('hidden items-end gap-4 border-b px-4 py-1.5 lg:grid', SPAN_COLUMNS)}>{head}</div>
      <ul>
        {rows.map(({ span, times, repeats, share }) => (
          <li key={`${span.op} ${span.description}`} className={cn('grid items-center gap-x-4 border-b px-3 py-2 md:px-4', SPAN_COLUMNS, repeats && 'bg-hit')}>
            <span className="mono truncate text-muted-foreground max-lg:hidden" title={span.op}>{span.op}</span>
            <span className="mono min-w-0 truncate max-lg:line-clamp-3 max-lg:whitespace-normal max-lg:break-all" title={span.description}>
              <span className="text-muted-foreground lg:hidden">{span.op} </span>
              {span.description}
            </span>
            <span className={cn('mono text-right tabular-nums max-lg:hidden', repeats && 'font-semibold')}>{times === undefined ? compact(span.count) : formatTimes(times)}</span>
            <span className="mono text-right tabular-nums max-lg:hidden">{formatMs(span.avgDuration)}</span>
            <span className="mono text-right tabular-nums max-lg:hidden">{formatMs(span.p95Duration)}</span>
            <span className="mono text-right font-semibold tabular-nums max-lg:hidden">{formatMs(span.totalTime)}</span>
            <span className="relative h-3 border-b border-grid max-lg:hidden" aria-hidden>
              <span className="absolute bottom-0 left-0 h-1.5 bg-foreground/50" style={{ width: `${share * 100}%` }} />
            </span>
            <span className="mono mt-1 flex flex-wrap gap-x-3 text-muted-foreground lg:hidden">
              <span className={cn(repeats ? 'font-semibold text-foreground' : undefined)}>{times === undefined ? `${compact(span.count)} calls` : `${formatTimes(times)} per request`}</span>
              <span>avg {formatMs(span.avgDuration)}</span>
              <span className="text-foreground">total {formatMs(span.totalTime)}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

function SpansA({ org, search, repeats }: { org: string; search: PerformanceSearch; repeats: number }) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<SpanSort>('-total_time')
  const spans = useQuery(spanGroupsQuery(org, { op: search.op, sort }))
  const peak = Math.max(...(spans.data ?? []).map((span) => span.totalTime), 1)
  const head = (label: string, value: SpanSort) => (
    <button type="button" onClick={() => setSort(value)} aria-pressed={sort === value} className={cn(HEAD, 'flex cursor-pointer items-center justify-end gap-1 hover:text-foreground', sort === value && 'text-foreground')}>
      {label}
      {sort === value && <ArrowDown className="size-3" />}
    </button>
  )
  return (
    <>
      <PageBar className="max-lg:h-auto max-lg:flex-wrap max-lg:gap-y-0 max-lg:pb-2">
        <div className="flex h-11 items-stretch overflow-x-auto max-lg:w-full">
          <Tabs org={org} current={Tab.spans} repeats={repeats} />
        </div>
        <OpFilter op={search.op} onChange={(op) => void navigate({ to: '/$org/prototype/performance', params: { org }, search: { ...search, op } })} />
      </PageBar>
      {spans.isPending ? (
        <SkeletonRows />
      ) : spans.data?.length ? (
        <SpanTable
          rows={spans.data.map((span) => ({ span, share: span.totalTime / peak }))}
          head={
            <>
              <span className="label-caps">Kind</span>
              <span className="label-caps">Span</span>
              {head(SPAN_SORTS[2]!.label, '-count')}
              {head(SPAN_SORTS[1]!.label, '-avg_duration')}
              <span className={HEAD}>Slow</span>
              {head(SPAN_SORTS[0]!.label, '-total_time')}
              <span />
            </>
          }
        />
      ) : (
        <Screen title="No spans in the last 7 days" />
      )}
    </>
  )
}

const SpanSortKey = { time: 'time', times: 'times', average: 'average', slow: 'slow' } as const
type SpanSortKey = (typeof SpanSortKey)[keyof typeof SpanSortKey]
const SPAN_ORDER: Record<SpanSortKey, (row: SpanRow) => number> = {
  time: (row) => row.totalTime,
  times: (row) => row.times,
  average: (row) => row.avgDuration,
  slow: (row) => row.p95Duration,
}

export function DetailA({ org, groupId }: { org: string; groupId: string }) {
  const { detail, axis, marks, project, missing, loading } = useGroupDetail(org, groupId)
  const [op, setOp] = useState<string>()
  const [order, setOrder] = useState<SpanSortKey>(SpanSortKey.time)
  const crumb = (
    <PageBar>
      <Link to="/$org/prototype/performance" params={{ org }} search={{ variant }} className="shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground">
        Performance
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      {detail && <GroupName group={detail.group} className="truncate" />}
    </PageBar>
  )
  if (missing) return <>{crumb}<Screen title="This transaction no longer exists" /></>
  if (loading || !detail) return <>{crumb}<SkeletonRows /></>
  const { group, request, time } = detail
  const rows = request.rows.filter((row) => !op || row.op.startsWith(op)).sort((a, b) => SPAN_ORDER[order](b) - SPAN_ORDER[order](a))
  const peak = Math.max(...request.rows.map((row) => row.totalTime), 1)
  const head = (label: string, key: SpanSortKey) => (
    <button type="button" onClick={() => setOrder(key)} aria-pressed={order === key} className={cn(HEAD, 'flex cursor-pointer items-center justify-end gap-1 hover:text-foreground', order === key && 'text-foreground')}>
      {label}
      {order === key && <ArrowDown className="size-3" />}
    </button>
  )
  return (
    <>
      {crumb}
      <div className="border-b px-3 py-4 md:px-4">
        <h1 className="mono text-lg font-medium break-all lg:text-xl">
          <span className="font-semibold">{group.method || group.op}</span> {group.transaction}
        </h1>
        <p className="mono mt-1 text-muted-foreground">
          {project} · {group.op} · seen {ago(group.lastSeen)} ago
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-4 lg:flex lg:gap-12">
          <Stat label="Requests">{compact(group.count)}</Stat>
          <Stat label="Typical">{formatMs(group.p50 ?? 0)}</Stat>
          <Stat label="Slow">{formatMs(group.p95 ?? 0)}</Stat>
          <Stat label="Average">{formatMs(group.avgDuration)}</Stat>
          <Stat label="Failed" className={cn(group.errorRate >= 5 && 'text-destructive')}>
            {formatPercent(group.errorRate)}
          </Stat>
        </dl>
      </div>
      <section className="border-b px-3 py-4 md:px-4">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel>Span time per request, 7 days</SectionLabel>
          <span className="mono text-muted-foreground">peak {formatMs(Math.max(...time))}</span>
        </div>
        <ReleaseTrace buckets={time} marks={marks} height={72} className="mt-2" />
        <div className="mono mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{new Date(axis.start * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <span>Today</span>
        </div>
      </section>
      <section>
        <div className="flex h-11 items-center gap-3 px-3 md:px-4">
          <SectionLabel className="shrink-0">Spans</SectionLabel>
          <OpFilter op={op} onChange={setOp} />
        </div>
        <SpanTable
          rows={rows.map((row) => ({ span: row, times: row.times, repeats: row.repeats, share: row.totalTime / peak }))}
          head={
            <>
              <span className="label-caps">Kind</span>
              <span className="label-caps">Span</span>
              {head('Per request', SpanSortKey.times)}
              {head('Average', SpanSortKey.average)}
              {head('Slow', SpanSortKey.slow)}
              {head('Total time', SpanSortKey.time)}
              <span />
            </>
          }
        />
      </section>
    </>
  )
}

const REPEAT_COLUMNS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)_96px_88px_104px_88px]'

export function RepeatsA({ org, search }: { org: string; search: PerformanceSearch }) {
  const { insights, patterns, loading } = useInsights(org, search)
  return (
    <>
      <PageBar>
        <div className="flex h-11 items-stretch overflow-x-auto">
          <Tabs org={org} current={Tab.repeats} repeats={patterns.length} />
        </div>
      </PageBar>
      <div className={cn('hidden items-end gap-4 border-b px-4 py-1.5 lg:grid', REPEAT_COLUMNS)}>
        <span className="label-caps">Transaction</span>
        <span className="label-caps">Query</span>
        <span className={HEAD}>Per request</span>
        <span className={HEAD}>Each</span>
        <span className={HEAD}>Per request</span>
        <span className={HEAD}>Requests</span>
      </div>
      {loading ? (
        <SkeletonRows />
      ) : patterns.length === 0 ? (
        <Screen title="No repeated queries in the last 7 days" />
      ) : (
        <ul>
          {patterns.map((pattern) => {
            const group = insights.find((insight) => insight.group.transaction === pattern.transactionName)?.group
            const row = (
              <>
                <span className="mono min-w-0 truncate font-medium max-lg:whitespace-normal max-lg:break-all">
                  {group && <span className="font-semibold">{group.method || group.op} </span>}
                  {pattern.transactionName}
                </span>
                <span className="mono min-w-0 truncate text-muted-foreground max-lg:mt-1 max-lg:line-clamp-3 max-lg:whitespace-normal max-lg:break-all" title={pattern.description}>
                  {pattern.description}
                </span>
                <span className="mono text-right font-semibold tabular-nums max-lg:hidden">{formatTimes(pattern.spansPerTxn)}</span>
                <span className="mono text-right tabular-nums max-lg:hidden">{formatMs(pattern.avgDuration)}</span>
                <span className="mono text-right tabular-nums max-lg:hidden">{formatMs(pattern.spansPerTxn * pattern.avgDuration)}</span>
                <span className="mono text-right tabular-nums max-lg:hidden">{compact(pattern.transactionCount)}</span>
                <span className="mono mt-1 flex flex-wrap gap-x-3 text-muted-foreground lg:hidden">
                  <span className="font-semibold text-foreground">{formatTimes(pattern.spansPerTxn)} per request</span>
                  <span>{formatMs(pattern.avgDuration)} each</span>
                  <span>{formatMs(pattern.spansPerTxn * pattern.avgDuration)} per request</span>
                </span>
              </>
            )
            const className = cn('grid items-center gap-x-4 px-3 py-2.5 md:px-4 lg:py-2', REPEAT_COLUMNS)
            return (
              <li key={`${pattern.transactionName} ${pattern.description}`} className="border-b">
                {group ? (
                  <Link to="/$org/prototype/performance/$groupId" params={{ org, groupId: String(group.id) }} search={{ variant }} className={cn(className, 'hover:bg-accent/60')}>
                    {row}
                  </Link>
                ) : (
                  <div className={className}>{row}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
