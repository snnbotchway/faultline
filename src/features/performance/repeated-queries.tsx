import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { compact } from '@/features/issues/format'
import { openBeside } from '@/lib/layout'
import { cn } from '@/lib/utils'
import type { Repeat } from './data'
import { formatMs, formatPercent, formatTimes } from './format'
import { Breakable, SectionLabel, SpanStorageHint, Stat } from './parts'
import type { PerformanceSearch } from './search'

// More runs than this are drawn as this many marks; the figure beside the bar says how many there are.
const MAX_TICKS = 60

function Where({ repeat }: { repeat: Repeat }) {
  const group = repeat.transaction?.group
  return (
    <>
      in{' '}
      <span className="text-foreground">
        {group ? `${group.method || group.op} ` : ''}
        <Breakable text={repeat.transactionName} />
      </span>
    </>
  )
}

// One query that repeats: what it is, and how much of a request it takes.
function RepeatPane({ org, repeat, onOpen }: { org: string; repeat: Repeat; onOpen: (groupId: string) => void }) {
  const group = repeat.transaction?.group
  return (
    <article className="px-3 py-4 md:px-5" aria-labelledby="repeat-runs">
      <h2 id="repeat-runs" className="font-mono text-2xl font-medium">
        {formatTimes(repeat.spansPerTxn)} per request
      </h2>
      <p className="mono mt-1 break-words text-muted-foreground">
        <Where repeat={repeat} />
        {repeat.transaction?.project ? ` · ${repeat.transaction.project}` : ''}
      </p>
      <pre className="mono mt-4 border bg-code p-3 break-words whitespace-pre-wrap">{repeat.description}</pre>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <SectionLabel>One request</SectionLabel>
        <span className="mono">
          <span className="font-semibold">{formatMs(repeat.perRequest)}</span>
          {repeat.request !== undefined && ` of ${formatMs(repeat.request)}`}
        </span>
      </div>
      {repeat.share === undefined ? (
        <p className="mt-2 text-sm text-muted-foreground">More than one transaction has this name, so its share of a request is unknown.</p>
      ) : (
        <div className="mt-2 flex h-7 border" aria-hidden>
          <span className="flex gap-px" style={{ width: `${repeat.share * 100}%` }}>
            {Array.from({ length: Math.min(MAX_TICKS, Math.round(repeat.spansPerTxn)) }, (_, index) => (
              <span key={index} className="min-w-px flex-1 bg-foreground/55" />
            ))}
          </span>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {repeat.share !== undefined && <Stat label="Share of request">{formatPercent(repeat.share * 100)}</Stat>}
        <Stat label="Each run">{formatMs(repeat.avgDuration)}</Stat>
        <Stat label="Requests, 7 days">{compact(repeat.transactionCount)}</Stat>
        <Stat label="Total, 7 days">{formatMs(repeat.totalTime)}</Stat>
      </dl>
      {group && (
        <Button asChild variant="default" className="mt-6 max-lg:h-11 max-lg:w-full">
          <Link
            to="/$org/performance/transaction-groups/$groupId"
            params={{ org, groupId: String(group.id) }}
            onClick={(event) => openBeside(event, () => onOpen(String(group.id)))}
          >
            Open transaction
            <ChevronRight />
          </Link>
        </Button>
      )}
    </article>
  )
}

// One row per query that repeats, as the backend reports them, with the picked one beside the list.
// On a phone the list and the picked query take turns.
export function RepeatedQueries({
  org,
  search,
  repeats,
  noSpanData,
  go,
}: {
  org: string
  search: PerformanceSearch
  repeats: Repeat[]
  noSpanData: boolean
  go: (patch: Partial<PerformanceSearch>) => void
}) {
  const picked = repeats.find((repeat) => repeat.key === search.pattern)
  const open = picked ?? repeats[0]
  if (!open) {
    if (search.query)
      return (
        <Screen title="No repeated queries match">
          <Button onClick={() => go({ query: undefined })}>Clear the search</Button>
        </Screen>
      )
    return noSpanData ? (
      <Screen title="No span details in the last 7 days">
        <SpanStorageHint />
      </Screen>
    ) : (
      <Screen title="No query repeated in the last 7 days" />
    )
  }
  return (
    <div className="flex flex-1 items-start">
      <div className={cn('min-w-0 flex-1 lg:max-w-list lg:border-r', picked && 'max-lg:hidden')}>
        <div className="flex items-end justify-between gap-3 border-b px-3 py-2 md:px-4">
          <span className="label-caps">Runs per request, 7 days</span>
          <span className="label-caps shrink-0 text-right">Per request</span>
        </div>
        <ul aria-label="Repeated queries">
          {repeats.map((repeat) => {
            const current = repeat === open
            return (
              <li key={repeat.key} className="border-b">
                <Link
                  to="/$org/performance/transaction-groups"
                  params={{ org }}
                  search={{ ...search, pattern: repeat.key }}
                  replace
                  aria-current={current ? 'true' : undefined}
                  className={cn('grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-3 md:px-4', current ? 'lg:bg-selected' : 'hover:bg-accent/60')}
                >
                  <span className="font-mono text-lg font-medium tabular-nums">{formatTimes(repeat.spansPerTxn)}</span>
                  <span className="min-w-0">
                    <span className="mono line-clamp-2 break-words">{repeat.description}</span>
                    <span className="mono mt-1 block break-words text-muted-foreground">
                      <Where repeat={repeat} />
                    </span>
                  </span>
                  <span className="mono text-right tabular-nums">
                    <span className="block font-semibold">{formatMs(repeat.perRequest)}</span>
                    {repeat.share !== undefined && <span className="text-muted-foreground">{formatPercent(repeat.share * 100)}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      <aside className={cn('min-w-0 flex-1 lg:side-pane', !picked && 'max-lg:hidden')} aria-label="Repeated query">
        <Link
          to="/$org/performance/transaction-groups"
          params={{ org }}
          search={{ ...search, pattern: undefined }}
          replace
          className="flex h-11 items-center gap-1 border-b px-3 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ChevronLeft className="size-4" />
          Repeated queries
        </Link>
        <RepeatPane org={org} repeat={open} key={open.key} onOpen={(group) => go({ view: undefined, query: undefined, order: undefined, pattern: undefined, group })} />
      </aside>
    </div>
  )
}
