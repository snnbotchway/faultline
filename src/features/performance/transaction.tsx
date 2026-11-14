import { Link } from '@tanstack/react-router'
import { ChevronLeft, Repeat } from 'lucide-react'
import { useState } from 'react'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { compact } from '@/features/issues/format'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { FAILING_PERCENT, useTransaction } from './data'
import { formatMs, formatPercent, formatTimes } from './format'
import { kindOf, type SpanRow } from './measures'
import { Breakable, SectionLabel, SkeletonRows, Slower, SpanStorageHint, Stat, TransactionName, WeekChart } from './parts'

const SHADES = ['bg-foreground/70', 'bg-foreground/45', 'bg-foreground/25']
const SHADE_TEXT = ['text-background', 'text-background', 'text-foreground']
// A segment narrower than this share of the bar has no room for its number.
const NUMBERED_FROM = 0.05
const spanKey = (row: SpanRow) => `${row.op} ${row.description}`
const SPAN_GRID = 'grid grid-cols-[24px_minmax(0,1fr)_auto] gap-x-2 border-b px-2 py-2'

// The share of an average request spent in each span group, largest first, numbered as in the list
// below. It is a split, not a timeline: the backend keeps no order for spans.
function RequestSplit({ rows, outside, total, kind }: { rows: SpanRow[]; outside: number; total: number; kind?: string }) {
  return (
    <div className="flex h-7 w-full gap-px" aria-hidden>
      {rows.map((row, index) => (
        <span
          key={spanKey(row)}
          className={cn(
            'mono grid min-w-1 place-items-center overflow-hidden text-xs',
            SHADES[index % SHADES.length],
            SHADE_TEXT[index % SHADES.length],
            kind && kindOf(row.op) !== kind && 'dimmed',
          )}
          style={{ width: `${(row.time / total) * 100}%` }}
        >
          {row.time / total > NUMBERED_FROM ? index + 1 : ''}
        </span>
      ))}
      {outside > 0 && <span className={cn('min-w-1 border', kind && 'dimmed')} style={{ width: `${(outside / total) * 100}%` }} />}
    </div>
  )
}

function KindFilter({ kinds, kind, onChange }: { kinds: string[]; kind: string | undefined; onChange: (kind: string | undefined) => void }) {
  if (kinds.length < 2) return null
  return (
    <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Kind of span">
      {[undefined, ...kinds].map((item) => (
        <button
          key={item ?? ''}
          type="button"
          aria-pressed={item === kind}
          onClick={() => onChange(item)}
          className={cn('h-7 border px-3 max-lg:h-11 max-lg:px-4', item ? 'mono' : 'text-sm', item === kind ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground')}
        >
          {item ?? 'All'}
        </button>
      ))}
    </div>
  )
}

// One transaction: how long it takes, how that changed over the week, and where an average request spends its time.
export function TransactionPane({ org, groupId }: { org: string; groupId: string }) {
  const { detail, axis, marks, project, missing, denied, failed, retry } = useTransaction(org, groupId)
  const [kind, setKind] = useState<string>()
  if (missing) return <Screen title="This transaction no longer exists" />
  if (denied) return <Screen title="You can't see this transaction" />
  if (failed)
    return (
      <Screen title="This transaction didn't load">
        <Button onClick={retry}>Try again</Button>
      </Screen>
    )
  if (!detail) return <SkeletonRows rows={6} />
  const { group, request, time, slower, since, shared } = detail
  const kinds = [...new Set(request.rows.map((row) => kindOf(row.op)))]
  const hasSpans = request.rows.length > 0
  return (
    <article className="px-3 py-4 md:px-5" aria-labelledby="transaction-name">
      <h2 id="transaction-name" className="text-lg font-medium break-words">
        <TransactionName group={group} className="text-lg" />
      </h2>
      <p className="mono mt-1 text-muted-foreground">{project}</p>

      <SectionLabel className="mt-5">All time</SectionLabel>
      <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
        <Stat label="Typical">{formatMs(group.p50 ?? 0)}</Stat>
        <Stat label="Slow">{formatMs(group.p95 ?? 0)}</Stat>
        <Stat label="Average">{formatMs(group.avgDuration)}</Stat>
        <Stat label="Requests">{compact(group.count)}</Stat>
        <Stat label="Failed">
          <span className={cn(group.errorRate >= FAILING_PERCENT && 'text-destructive')}>{formatPercent(group.errorRate)}</span>
        </Stat>
      </dl>

      {hasSpans ? (
        <>
          {shared && <p className="mt-6 text-sm text-muted-foreground">The chart and spans also count the other transactions named <span className="mono text-foreground">{group.transaction}</span>.</p>}
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <SectionLabel>Time in spans per request, 7 days</SectionLabel>
            {slower && <Slower slower={slower} since={since} />}
          </div>
          <WeekChart buckets={time} marks={marks} axis={axis} slower={!!slower} height={56} className="mt-2" />

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <SectionLabel>Average request by span, 7 days</SectionLabel>
            <span className="mono font-semibold">{formatMs(request.total)}</span>
          </div>
          <div className="mt-2">
            <RequestSplit rows={request.rows} outside={request.outside} total={request.total} kind={kind} />
          </div>
          <KindFilter kinds={kinds} kind={kind} onChange={setKind} />
          <ol className="mt-3 border-t" aria-label="Spans, largest first">
            {request.rows.map((row, index) =>
              kind && kindOf(row.op) !== kind ? null : (
                <li key={spanKey(row)} className={SPAN_GRID}>
                  <span className="mono text-muted-foreground tabular-nums">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="mono block break-words">
                      <span className="text-muted-foreground">{row.op}</span> <Breakable text={row.description} />
                    </span>
                    <span className="mono mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
                      <span className={cn('flex items-center gap-1', row.repeats && 'font-semibold text-foreground')}>
                        {row.repeats && <Repeat className="size-3 text-trend-spiking" aria-label="Repeats" />}
                        {formatTimes(row.times)} per request
                      </span>
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
              <li className={SPAN_GRID}>
                <span />
                <span>Outside spans</span>
                <span className="mono text-right tabular-nums">
                  <span className="block font-semibold">{formatMs(request.outside)}</span>
                  <span className="text-muted-foreground">{formatPercent((request.outside / request.total) * 100)}</span>
                </span>
              </li>
            )}
          </ol>
        </>
      ) : (
        <div className="mt-6 border-t pt-4">
          <p className="font-medium">No span details in the last 7 days</p>
          <div className="mt-1">
            <SpanStorageHint />
          </div>
        </div>
      )}
    </article>
  )
}

// The transaction as a page of its own: where a phone opens it, and where a link to it lands.
export function TransactionPage({ org, groupId }: { org: string; groupId: string }) {
  useTitle('Transaction', 'Performance')
  return (
    <>
      <PageBar>
        <Link
          to="/$org/performance/transaction-groups"
          params={{ org }}
          search={{ group: groupId }}
          className="flex h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Performance
        </Link>
      </PageBar>
      <div className="mx-auto w-full max-w-3xl">
        <TransactionPane org={org} groupId={groupId} />
      </div>
    </>
  )
}
