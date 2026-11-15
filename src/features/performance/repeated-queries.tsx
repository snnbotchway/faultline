import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { compact } from '@/features/issues/format'
import { useT } from '@/i18n'
import { useHotkeys } from '@/lib/hotkeys'
import { isDesktop, openBeside, useIsDesktop } from '@/lib/layout'
import { cn } from '@/lib/utils'
import type { Repeat } from './data'
import { formatMs, formatPercent, formatTimes } from './format'
import { Breakable, SectionLabel, SpanStorageHint, Stat } from './parts'
import type { PerformanceSearch } from './search'

// More runs than this are drawn as this many marks; the figure beside the bar says how many there are.
const MAX_TICKS = 60

function Where({ repeat }: { repeat: Repeat }) {
  const t = useT().performance.repeated
  const group = repeat.transaction?.group
  return t.where(
    <span className="text-foreground">
      {group ? `${group.method || group.op} ` : ''}
      <Breakable text={repeat.transactionName} />
    </span>,
  )
}

// One query that repeats: what it is, and how much of a request it takes.
function RepeatPane({ org, repeat, onOpen }: { org: string; repeat: Repeat; onOpen: (groupId: number) => void }) {
  const t = useT().performance
  const group = repeat.transaction?.group
  return (
    <article className="px-3 py-4 md:px-5" aria-labelledby="repeat-runs">
      <h2 id="repeat-runs" className="font-mono text-2xl font-medium">
        {t.perRequest(formatTimes(repeat.spansPerTxn))}
      </h2>
      <p className="mono mt-1 break-words text-muted-foreground">
        <Where repeat={repeat} />
        {repeat.transaction?.project ? ` · ${repeat.transaction.project}` : ''}
      </p>
      <pre className="mono mt-4 border bg-code p-3 break-words whitespace-pre-wrap">{repeat.description}</pre>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <SectionLabel>{t.repeated.oneRequest}</SectionLabel>
        <span className="mono">{t.repeated.ofRequest(<span className="font-semibold">{formatMs(repeat.perRequest)}</span>, repeat.request === undefined ? undefined : formatMs(repeat.request))}</span>
      </div>
      {repeat.shared && <p className="mt-2 text-sm text-muted-foreground">{t.repeated.sharedUnknown}</p>}
      {repeat.share !== undefined && (
        <div className="mt-2 flex h-7 border" aria-hidden>
          <span className="flex gap-px" style={{ width: `${repeat.share * 100}%` }}>
            {Array.from({ length: Math.min(MAX_TICKS, Math.round(repeat.spansPerTxn)) }, (_, index) => (
              <span key={index} className="min-w-px flex-1 bg-foreground/55" />
            ))}
          </span>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {repeat.share !== undefined && <Stat label={t.repeated.shareOfRequest}>{formatPercent(repeat.share * 100)}</Stat>}
        <Stat label={t.repeated.eachRun}>{formatMs(repeat.avgDuration)}</Stat>
        <Stat label={t.repeated.requests7}>{compact(repeat.transactionCount)}</Stat>
        <Stat label={t.repeated.total7}>{formatMs(repeat.totalTime)}</Stat>
      </dl>
      {group && (
        <Button asChild variant="default" className="mt-6 max-lg:h-11 max-lg:w-full">
          <Link
            to="/$org/performance/transaction-groups/$groupId"
            params={{ org, groupId: String(group.id) }}
            onClick={(event) => openBeside(event, () => onOpen(group.id))}
          >
            {t.repeated.openTransaction}
            <ChevronRight />
          </Link>
        </Button>
      )}
    </article>
  )
}

// One row per query that repeats, as the backend reports them, with the picked one beside the list.
// On a phone the list and the picked query take turns, each a step in the history, so Back returns to the list.
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
  const t = useT().performance
  const picked = repeats.find((repeat) => repeat.key === search.pattern)
  const open = picked ?? repeats[0]
  const desktop = useIsDesktop()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const move = (step: number) => {
    const next = repeats[Math.max(0, Math.min(repeats.length - 1, repeats.findIndex((repeat) => repeat === open) + step))]
    if (next && isDesktop()) go({ pattern: next.key })
  }
  useHotkeys({ j: () => move(1), k: () => move(-1) })
  if (!open) {
    if (search.query)
      return (
        <Screen title={t.empty.noRepeatsMatch}>
          <Button onClick={() => go({ query: undefined })}>{t.clearSearch}</Button>
        </Screen>
      )
    return noSpanData ? (
      <Screen title={t.noDetails}>
        <SpanStorageHint />
      </Screen>
    ) : (
      <Screen title={t.empty.noRepeats} />
    )
  }
  return (
    <div className="flex flex-1 items-start">
      <div className={cn('min-w-0 flex-1 lg:max-w-list lg:border-r', picked && 'max-lg:hidden')}>
        <div className="flex items-end justify-between gap-3 border-b px-3 py-2 md:px-4">
          <span className="label-caps">{t.repeated.runsPerRequest}</span>
          <span className="label-caps shrink-0 text-right">{t.repeated.timePerRequest}</span>
        </div>
        <ul aria-label={t.views.repeated.label}>
          {repeats.map((repeat) => {
            const current = repeat === open
            return (
              <li key={repeat.key} className="border-b">
                <Link
                  to="/$org/performance/transaction-groups"
                  params={{ org }}
                  search={{ ...search, pattern: repeat.key }}
                  replace={desktop}
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
      <aside className={cn('min-w-0 flex-1 lg:side-pane', !picked && 'max-lg:hidden')} aria-label={t.repeated.repeatedQuery}>
        <Link
          to="/$org/performance/transaction-groups"
          params={{ org }}
          search={{ ...search, pattern: undefined }}
          onClick={(event) => {
            if (!canGoBack) return
            event.preventDefault()
            router.history.back()
          }}
          className="flex h-11 items-center gap-1 border-b px-3 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ChevronLeft className="size-4" />
          {t.views.repeated.label}
        </Link>
        <RepeatPane org={org} repeat={open} key={open.key} onOpen={(group) => go({ view: undefined, query: undefined, order: undefined, pattern: undefined, group })} />
      </aside>
    </div>
  )
}
