import { useNavigate } from '@tanstack/react-router'
import { CalendarDays, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { Fragment, useState } from 'react'
import { HttpStatus, hasStatus } from '@/api/client'
import type { LogEvent } from '@/api/logs'
import { SearchField } from '@/components/search-field'
import { ListPageBar } from '@/components/list-page-bar'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n'
import { useHotkeys } from '@/lib/hotkeys'
import { hitsText, type Hits } from '@/lib/format'
import { isDesktop, useIsDesktop } from '@/lib/layout'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { valueName } from '@/lib/text'
import { followsFilters, useCounts, useLogs } from './data'
import { ActiveFilters, Facets } from './filters'
import { clockTime, dayOf, fullTime, preview } from './format'
import { LogHistogram } from './histogram'
import { LogLevelGlyph } from './level'
import { LogActions, LogFields } from './log-detail'
import { NO_FILTERS, RANGES, facetCount, isNarrowed, levelOf, rangeOf, type LogSearch, type SetSearch } from './search'

// A count of logs that stops at the backend's limit (`1000+`) is worded as it is; an exact one agrees with its word.
const logCount = (hits: Hits) => (hits.capped ? hitsText(hits) : hits.n)

const HISTOGRAM_HEIGHT = 64

function RangeMenu({ search, set }: { search: LogSearch; set: SetSearch }) {
  const t = useT().logs
  const range = rangeOf(search)
  // The button shows "24h"; its name and hover say it in full, so a phone, which has no hover, still has the words.
  const name = `${valueName(t.timeRange, t.rangeShort[range.value])} (${t.ranges[range.value]})`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="shrink-0 gap-2 max-lg:h-11" aria-label={name} title={name}>
          <CalendarDays />
          <span className="mono">{t.rangeShort[range.value]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={range.value} onValueChange={(value) => set({ range: RANGES.find((item) => item.value === value)?.value, hour: undefined })}>
          {RANGES.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {t.ranges[item.value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SkeletonRows() {
  const t = useT().logs
  return (
    <ul aria-busy aria-label={t.loading}>
      {Array.from({ length: 12 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 border-b px-3 py-3 md:px-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 flex-1" />
        </li>
      ))}
    </ul>
  )
}

function LevelAndTime({ log, className }: { log: LogEvent; className?: string }) {
  return (
    <p className={cn('mono flex min-w-0 items-center gap-2', className)}>
      <LogLevelGlyph level={levelOf(log)} />
      <span className="font-semibold">{log.level}</span>
      <span className="truncate text-muted-foreground">{fullTime(log.timestamp)}</span>
    </p>
  )
}

export function LogsPage({ org, search }: { org: string; search: LogSearch }) {
  const t = useT()
  const l = t.logs
  useTitle(t.shell.sections.logs)
  const navigate = useNavigate()
  const set: SetSearch = (patch) => void navigate({ to: '/$org/logs', params: { org }, search: { ...search, ...patch }, replace: true })
  const logs = useLogs(org, search)
  const desktop = useIsDesktop()
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Counted only where the filters show: the rail on a desktop, the Filters dialog on a phone.
  const counts = useCounts(org, logs, search, desktop || filtersOpen)
  const { list, open } = logs
  const active = facetCount(search)
  const narrowed = isNarrowed(search)
  const chartFollows = followsFilters(search)
  const clear = () => set(NO_FILTERS)

  const move = (step: number) => {
    if (!open || !isDesktop()) return
    const next = logs.logs[logs.logs.findIndex((log) => log.id === open.id) + step]
    if (next) set({ log: next.id })
  }
  useHotkeys({ j: () => move(1), k: () => move(-1), Escape: () => open && set({ log: undefined }) })

  return (
    <>
      <ListPageBar title={t.shell.sections.logs}>
        <SearchField
          key={search.query}
          query={search.query}
          label={l.searchMessages}
          onSubmit={(query) => set({ query, log: undefined })}
          className="max-lg:order-last max-lg:basis-full lg:max-w-lg"
        />
        <div className="ml-auto flex items-center gap-2">
          <div className="flex lg:hidden">
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-11">
                  <SlidersHorizontal />
                  {l.filters}
                  {active > 0 && <span className="mono font-semibold">{active}</span>}
                </Button>
              </DialogTrigger>
              <DialogContent className="dialog-scroll p-3">
                <DialogTitle className="px-2 pb-3">{l.filters}</DialogTitle>
                <Facets logs={logs} search={search} counts={counts} set={set} />
              </DialogContent>
            </Dialog>
            {active > 0 && (
              <Button size="icon-touch" className="border-l-0" aria-label={l.clearFilters} onClick={clear}>
                <X />
              </Button>
            )}
          </div>
          <RangeMenu search={search} set={set} />
        </div>
      </ListPageBar>
      <div className="flex flex-1 items-start">
        <aside className="side-pane hidden w-60 shrink-0 border-r px-2 py-4 lg:block" aria-label={l.filters}>
          <Facets logs={logs} search={search} counts={counts} set={set} />
          {narrowed && (
            <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={clear}>
              {l.clearFilters}
            </Button>
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="border-b px-3 py-3 md:px-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="label-caps">{l.logsPerHour}</h2>
              {logs.total && <span className="mono font-semibold">{l.logs(logCount(logs.total))}</span>}
            </div>
            {!chartFollows && <p className="mb-2 text-sm text-muted-foreground">{l.chartNote}</p>}
            <LogHistogram buckets={logs.buckets} height={HISTOGRAM_HEIGHT} hour={search.hour} dim={!chartFollows} onPick={(hour) => set({ hour, log: undefined })} />
          </div>
          <ActiveFilters logs={logs} search={search} set={set} />
          {(logs.missing || logs.openFailed) && (
            <div className="flex items-center gap-2 border-b px-3 py-2 md:px-4 lg:hidden">
              <p className="flex-1">{logs.missing ? l.errors.missingNote : l.errors.openFailedNote}</p>
              {logs.openFailed && (
                <Button size="sm" className="h-11" onClick={logs.retryOpen}>
                  {t.common.tryAgain}
                </Button>
              )}
              <Button variant="ghost" size="icon-touch" aria-label={t.common.close} onClick={() => set({ log: undefined })}>
                <X />
              </Button>
            </div>
          )}
          {logs.spanPartial &&
            (list.isFetchNextPageError ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2 md:px-4">
                <p className="text-muted-foreground">{l.searchedSpanFailed(logs.loaded.length)}</p>
                <Button size="sm" className="max-lg:h-11" onClick={() => void list.fetchNextPage()}>
                  {t.common.tryAgain}
                </Button>
              </div>
            ) : (
              <p className="border-b px-3 py-2 text-muted-foreground md:px-4">{l.searchedSpan(logs.loaded.length)}</p>
            ))}
          {list.isPending ? (
            <SkeletonRows />
          ) : hasStatus(list.error, HttpStatus.forbidden) ? (
            <Screen title={l.errors.denied} />
          ) : list.isError && !list.data ? (
            <Screen title={l.errors.list}>
              <Button onClick={() => void list.refetch()}>{t.common.tryAgain}</Button>
            </Screen>
          ) : logs.logs.length === 0 ? (
            <Screen title={narrowed ? l.errors.noMatch : l.noLogsIn[logs.range.value]}>{narrowed && <Button onClick={clear}>{l.clearFilters}</Button>}</Screen>
          ) : (
            <ul aria-label={l.logList}>
              {logs.logs.map((log, index) => {
                const current = log.id === search.log
                const newDay = index === 0 || dayOf(log.timestamp) !== dayOf(logs.logs[index - 1]!.timestamp)
                return (
                  <Fragment key={log.id}>
                    {newDay && <li className="label-caps border-b bg-muted/60 px-3 py-1 md:px-4">{dayOf(log.timestamp)}</li>}
                    <li className="border-b">
                      <button
                        type="button"
                        aria-expanded={current}
                        onClick={() => set({ log: current ? undefined : log.id })}
                        className={cn(
                          'mono grid w-full grid-cols-[auto_12px_minmax(0,1fr)_16px] items-start gap-x-3 px-3 py-2 text-left md:px-4 lg:grid-cols-[104px_12px_minmax(0,1fr)]',
                          current ? 'bg-selected' : 'hover:bg-accent/60',
                        )}
                      >
                        <span className="text-muted-foreground tabular-nums">{clockTime(log.timestamp)}</span>
                        <LogLevelGlyph level={levelOf(log)} className="mt-1" />
                        <span className="min-w-0 max-lg:col-span-4 max-lg:row-start-2 max-lg:mt-1">
                          <span className="block break-words whitespace-pre-wrap">{log.body}</span>
                          <span className="mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
                            <span>{[log.service, log.host].filter(Boolean).join(' · ')}</span>
                            {preview(log).map(([key, value]) => (
                              <span key={key} className="max-lg:hidden">
                                {key}=<span className="text-foreground/80">{String(value)}</span>
                              </span>
                            ))}
                          </span>
                        </span>
                        <ChevronDown className={cn('mt-1 size-4 text-muted-foreground transition-transform duration-150 max-lg:col-start-4 max-lg:row-start-1 lg:hidden', current && 'rotate-180')} />
                      </button>
                      {current && (
                        <div className="border-t bg-card px-3 py-3 lg:hidden">
                          <LevelAndTime log={log} />
                          <div className="mt-3">
                            <LogActions log={log} search={search} set={set} />
                          </div>
                          <LogFields org={org} log={log} project={logs.projectOf(log)} search={search} className="mt-3 border-t" />
                        </div>
                      )}
                    </li>
                  </Fragment>
                )
              })}
            </ul>
          )}
          {list.hasNextPage && !search.spanId && (
            <div className="flex flex-col items-center gap-2 py-4">
              {list.isFetchNextPageError && <p className="text-muted-foreground">{l.olderFailed}</p>}
              <Button onClick={() => void list.fetchNextPage()} aria-busy={list.isFetchingNextPage} className="max-lg:h-11">
                {list.isFetchNextPageError ? t.common.tryAgain : l.loadOlder}
              </Button>
            </div>
          )}
        </div>
        {(logs.missing || logs.openFailed) && (
          <aside aria-label={l.log} className="side-pane hidden w-96 shrink-0 border-l lg:block xl:w-104">
            <div className="sticky top-0 flex h-11 items-center gap-2 border-b bg-card px-4">
              <p className="flex-1 font-semibold">{logs.missing ? l.errors.missing : l.errors.openFailed}</p>
              <Button variant="ghost" size="icon-sm" aria-label={t.common.close} onClick={() => set({ log: undefined })}>
                <X />
              </Button>
            </div>
            <div className="px-4 py-4">
              {logs.missing ? (
                <p className="text-muted-foreground">{l.errors.retention}</p>
              ) : (
                <Button onClick={logs.retryOpen}>{t.common.tryAgain}</Button>
              )}
            </div>
          </aside>
        )}
        {open && (
          <aside aria-label={l.log} className="side-pane hidden w-96 shrink-0 border-l lg:block xl:w-104">
            <div className="sticky top-0 flex h-11 items-center gap-2 border-b bg-card px-4">
              <LevelAndTime log={open} className="flex-1" />
              <Button variant="ghost" size="icon-sm" aria-label={t.common.close} onClick={() => set({ log: undefined })}>
                <X />
              </Button>
            </div>
            <div className="px-4 py-4">
              <p className="mono mb-4 break-words whitespace-pre-wrap">{open.body}</p>
              <LogActions log={open} search={search} set={set} />
              <h2 className="label-caps mt-6">{l.fields}</h2>
              <LogFields org={org} log={open} project={logs.projectOf(open)} search={search} className="mt-1 border-t" />
            </div>
          </aside>
        )}
      </div>
    </>
  )
}
