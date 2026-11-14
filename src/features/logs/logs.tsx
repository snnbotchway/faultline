import { useNavigate } from '@tanstack/react-router'
import { CalendarDays, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { Fragment } from 'react'
import { HttpStatus, hasStatus } from '@/api/client'
import type { LogEvent } from '@/api/logs'
import { SearchField } from '@/components/search-field'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useHotkeys } from '@/lib/hotkeys'
import { isDesktop } from '@/lib/layout'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { useCounts, useLogs } from './data'
import { ActiveFilters, Facets } from './filters'
import { clockTime, countText, dayOf, fullTime, preview } from './format'
import { LogHistogram } from './histogram'
import { LogLevelGlyph } from './level'
import { LogActions, LogFields } from './log-detail'
import { NO_FILTERS, RANGES, facetCount, isNarrowed, rangeOf, type LogSearch } from './search'

const HISTOGRAM_HEIGHT = 64

function RangeMenu({ search, set }: { search: LogSearch; set: (patch: Partial<LogSearch>) => void }) {
  const range = rangeOf(search)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="shrink-0 gap-2 max-lg:h-11" aria-label={`Time range: ${range.label}`}>
          <CalendarDays />
          <span className="mono">{range.value}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={range.value} onValueChange={(value) => set({ range: RANGES.find((item) => item.value === value)?.value, hour: undefined })}>
          {RANGES.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SkeletonRows() {
  return (
    <ul aria-busy aria-label="Loading logs">
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
      <LogLevelGlyph level={log.level} />
      <span className="font-semibold">{log.level}</span>
      <span className="truncate text-muted-foreground">{fullTime(log.timestamp)}</span>
    </p>
  )
}

export function LogsPage({ org, search }: { org: string; search: LogSearch }) {
  useTitle('Logs')
  const navigate = useNavigate()
  const set = (patch: Partial<LogSearch>) => void navigate({ to: '/$org/logs', params: { org }, search: { ...search, ...patch }, replace: true })
  const logs = useLogs(org, search)
  const counts = useCounts(org, logs)
  const { list, open } = logs
  const active = facetCount(search)
  const narrowed = isNarrowed(search)
  const clear = () => set(NO_FILTERS)

  const move = (step: number) => {
    if (!open || !isDesktop()) return
    const next = logs.logs[logs.logs.findIndex((log) => log.id === open.id) + step]
    if (next) set({ log: next.id })
  }
  useHotkeys({ j: () => move(1), k: () => move(-1), Escape: () => open && set({ log: undefined }) })

  return (
    <>
      <PageBar className="max-lg:h-auto max-lg:flex-wrap max-lg:gap-y-0 max-lg:pb-2">
        <h1 className="shrink-0 font-semibold max-lg:flex max-lg:h-11 max-lg:items-center">Logs</h1>
        <SearchField
          key={search.query}
          query={search.query}
          label="Search messages"
          onSubmit={(query) => set({ query, log: undefined })}
          className="max-lg:order-last max-lg:basis-full lg:max-w-lg"
        />
        <div className="ml-auto flex items-center gap-2">
          <div className="flex lg:hidden">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="h-11">
                  <SlidersHorizontal />
                  Filters
                  {active > 0 && <span className="mono font-semibold">{active}</span>}
                </Button>
              </DialogTrigger>
              <DialogContent className="top-[6vh] max-h-[86vh] overflow-y-auto p-3">
                <DialogTitle className="px-2 pb-3">Filters</DialogTitle>
                <Facets logs={logs} search={search} counts={counts} set={set} />
              </DialogContent>
            </Dialog>
            {active > 0 && (
              <Button size="sm" className="size-11 border-l-0 px-0" aria-label="Clear filters" onClick={clear}>
                <X />
              </Button>
            )}
          </div>
          <RangeMenu search={search} set={set} />
        </div>
      </PageBar>
      <div className="flex flex-1 items-start">
        <aside className="sticky top-11 hidden h-[calc(100dvh-2.75rem)] w-60 shrink-0 overflow-y-auto border-r px-2 py-4 lg:block" aria-label="Filters">
          <Facets logs={logs} search={search} counts={counts} set={set} />
          {narrowed && (
            <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={clear}>
              Clear filters
            </Button>
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="border-b px-3 py-3 md:px-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="label-caps">Logs per hour</h2>
              {logs.total && (
                <span className="mono text-muted-foreground">
                  <span className="font-semibold text-foreground">{countText(logs.total)}</span> {logs.total.n === 1 && !logs.total.capped ? 'log' : 'logs'}
                </span>
              )}
            </div>
            <LogHistogram buckets={logs.buckets} height={HISTOGRAM_HEIGHT} hour={search.hour} onPick={(hour) => set({ hour, log: undefined })} />
          </div>
          <ActiveFilters logs={logs} search={search} set={set} />
          {list.isPending ? (
            <SkeletonRows />
          ) : hasStatus(list.error, HttpStatus.forbidden) ? (
            <Screen title="You can't see logs in this organization" />
          ) : list.isError ? (
            <Screen title="The logs didn't load">
              <Button onClick={() => void list.refetch()}>Try again</Button>
            </Screen>
          ) : logs.logs.length === 0 ? (
            <Screen title={narrowed ? 'No logs match' : `No logs in the ${logs.range.label.toLowerCase()}`}>{narrowed && <Button onClick={clear}>Clear filters</Button>}</Screen>
          ) : (
            <ul aria-label="Logs">
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
                        <LogLevelGlyph level={log.level} className="mt-1" />
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
            <div className="flex justify-center py-4">
              <Button onClick={() => void list.fetchNextPage()} aria-busy={list.isFetchingNextPage} className="max-lg:h-11">
                Load older logs
              </Button>
            </div>
          )}
        </div>
        {open && (
          <aside aria-label="Log" className="sticky top-11 hidden h-[calc(100dvh-2.75rem)] w-96 shrink-0 overflow-y-auto border-l lg:block xl:w-104">
            <div className="sticky top-0 flex h-11 items-center gap-2 border-b bg-card px-4">
              <LevelAndTime log={open} className="flex-1" />
              <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => set({ log: undefined })}>
                <X />
              </Button>
            </div>
            <div className="px-4 py-4">
              <p className="mono mb-4 break-words whitespace-pre-wrap">{open.body}</p>
              <LogActions log={open} search={search} set={set} />
              <h2 className="label-caps mt-6">Fields</h2>
              <LogFields org={org} log={open} project={logs.projectOf(open)} search={search} className="mt-1 border-t" />
            </div>
          </aside>
        )}
      </div>
    </>
  )
}
