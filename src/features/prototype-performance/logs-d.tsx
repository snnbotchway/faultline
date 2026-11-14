// PROTOTYPE, throwaway. Logs variant D, the revision after the first pick: B's rail of filters and stream,
// with a count on every filter value. The open log sits in a panel on a desktop and unfolds in place on a phone.
import { useQueries, useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Copy, Ellipsis, SlidersHorizontal, Waypoints, X } from 'lucide-react'
import { Fragment } from 'react'
import { LogResourceType, logHitsQuery, logStatsQuery, type LogEvent, type LogFilters, type LogStats } from '@/api/logs'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ActiveFilters } from './logs-a'
import { LEVELS, LoadMore, LogFields, LogHistogram, LogLevelGlyph, LogSearchBox, RangeMenu, clockTime, dayOf, emptyTitle, fullTime, hourLabel, toggleLevel, useLogs, type LogSearch, type Logs } from './logs-shared'
import { SectionLabel, SkeletonRows } from './shared'

const number = new Intl.NumberFormat('en')
const sum = (stats: LogStats | undefined) => stats?.series.reduce((total, series) => total + series.data.reduce((a, b) => a + b, 0), 0)

type Count = number | { hits: number; capped: boolean } | undefined
const shown = (count: Count) => (count === undefined ? '' : typeof count === 'number' ? number.format(count) : `${number.format(count.hits)}${count.capped ? '+' : ''}`)

// A count beside every value you can narrow by, each computed with the other filters applied. Levels,
// services and environments come from the hourly statistics, which are exact; the statistics know nothing
// about hosts, so a host's count is the list's own, which the backend stops at 1,000.
function useCounts(org: string, search: LogSearch, logs: Logs) {
  const services = logs.resourcesOf(LogResourceType.service)
  const environments = logs.resourcesOf(LogResourceType.environment)
  const hosts = logs.resourcesOf(LogResourceType.host)
  const byLevel = useQuery(logStatsQuery(org, { ...logs.scope, level: undefined })).data
  const stats = (filters: LogFilters[]) => filters.map((filter) => logStatsQuery(org, filter))
  const byService = useQueries({ queries: stats(services.map((service) => ({ ...logs.scope, service }))) })
  const byEnvironment = useQueries({ queries: stats(environments.map((environment) => ({ ...logs.scope, environment }))) })
  const byHost = useQueries({ queries: hosts.map((host) => logHitsQuery(org, { ...logs.filters, host })) })
  // The number above the list. The statistics cannot apply a text search, a host or a trace, so with one of
  // those the list's own count is all there is.
  const exact = !search.query && !search.host && !search.traceId
  const bucket = logs.buckets.find((item) => item.start === search.hour)
  const total = !exact ? logs.hits : search.hour === undefined ? shown(logs.buckets.reduce((all, item) => all + item.errors + item.warnings + item.other, 0)) : bucket ? shown(bucket.errors + bucket.warnings + bucket.other) : logs.hits
  return {
    total,
    level: Object.fromEntries((byLevel?.series ?? []).map((series) => [series.name, series.data.reduce((a, b) => a + b, 0)])) as Record<string, number>,
    service: Object.fromEntries(services.map((name, index) => [name, sum(byService[index]?.data)])) as Record<string, Count>,
    environment: Object.fromEntries(environments.map((name, index) => [name, sum(byEnvironment[index]?.data)])) as Record<string, Count>,
    host: Object.fromEntries(hosts.map((name, index) => [name, byHost[index]?.data])) as Record<string, Count>,
  }
}

type Counts = ReturnType<typeof useCounts>
const ROW = 'flex h-8 w-full cursor-pointer items-center gap-2 px-2 text-left hover:bg-accent max-lg:h-11'

function Facet({ label, values, counts, current, onPick }: { label: string; values: string[]; counts: Record<string, Count>; current?: string; onPick: (value?: string) => void }) {
  if (values.length === 0) return null
  return (
    <section className="mt-4" role="radiogroup" aria-label={label}>
      <SectionLabel className="px-2">{label}</SectionLabel>
      <ul className="mt-1">
        {values.map((value) => {
          const on = value === current
          return (
            <li key={value}>
              <button type="button" role="radio" aria-checked={on} onClick={() => onPick(on ? undefined : value)} className={cn(ROW, 'mono', on && 'bg-selected font-semibold')}>
                <span className="truncate">{value}</span>
                <span className={cn('ml-auto shrink-0 tabular-nums', !on && 'text-muted-foreground')}>{shown(counts[value])}</span>
                <Check className={cn('size-3.5 shrink-0', !on && 'invisible')} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Facets({ logs, search, counts }: { logs: Logs; search: LogSearch; counts: Counts }) {
  return (
    <>
      <section aria-label="Level">
        <SectionLabel className="px-2">Level</SectionLabel>
        <ul className="mt-1">
          {LEVELS.map((level) => {
            const on = !!search.level?.includes(level)
            return (
              <li key={level}>
                <button type="button" role="checkbox" aria-checked={on} onClick={() => logs.set({ level: toggleLevel(search, level), log: undefined })} className={cn(ROW, 'mono', on && 'bg-selected font-semibold')}>
                  <LogLevelGlyph level={level} />
                  <span>{level}</span>
                  <span className={cn('ml-auto tabular-nums', !on && 'text-muted-foreground')}>{shown(counts.level[level] ?? 0)}</span>
                  <Check className={cn('size-3.5', !on && 'invisible')} />
                </button>
              </li>
            )
          })}
        </ul>
      </section>
      <Facet label="Service" values={logs.resourcesOf(LogResourceType.service)} counts={counts.service} current={search.service} onPick={(service) => logs.set({ service, log: undefined })} />
      <Facet label="Environment" values={logs.resourcesOf(LogResourceType.environment)} counts={counts.environment} current={search.environment} onPick={(environment) => logs.set({ environment, log: undefined })} />
      <Facet label="Host" values={logs.resourcesOf(LogResourceType.host)} counts={counts.host} current={search.host} onPick={(host) => logs.set({ host, log: undefined })} />
    </>
  )
}

const VENDOR_PREFIX = /^sentry\./
const PREVIEW = 3
const preview = (log: LogEvent) =>
  Object.entries(log.data ?? {})
    .filter(([key]) => !VENDOR_PREFIX.test(key))
    .slice(0, PREVIEW)

// The main thing to do with a log on a line of its own; the rest behind one menu.
function Actions({ log, logs, search }: { log: LogEvent; logs: Logs; search: LogSearch }) {
  const service = log.service && search.service !== log.service ? log.service : undefined
  const host = log.host && search.host !== log.host ? log.host : undefined
  return (
    <div className="flex flex-col items-start gap-2 lg:flex-row">
      {log.traceID && (
        <Button className="max-lg:h-11 max-lg:w-full" onClick={() => logs.set({ traceId: log.traceID ?? undefined, query: undefined, level: undefined, hour: undefined, log: undefined })}>
          <Waypoints />
          Logs in this trace
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="max-lg:h-11">
            <Ellipsis />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {service && (
            <DropdownMenuItem onSelect={() => logs.set({ service, log: undefined })}>
              Only <span className="mono">{service}</span>
            </DropdownMenuItem>
          )}
          {host && (
            <DropdownMenuItem onSelect={() => logs.set({ host, log: undefined })}>
              Only <span className="mono">{host}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => void navigator.clipboard?.writeText(JSON.stringify(log, null, 2))}>
            <Copy />
            Copy as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Trace({ log }: { log: LogEvent }) {
  if (!log.traceID) return null
  return (
    <p className="mono mt-2 break-all text-muted-foreground">
      trace {log.traceID}
      {log.spanID ? ` · span ${log.spanID}` : ''}
    </p>
  )
}

export function LogsD({ org, search }: { org: string; search: LogSearch }) {
  const logs = useLogs(org, search)
  const counts = useCounts(org, search, logs)
  const active = (search.level?.length ?? 0) + [search.service, search.environment, search.host].filter(Boolean).length
  const open = logs.logs.find((log) => log.id === search.log)
  return (
    <>
      <PageBar>
        <span className="shrink-0 font-semibold max-lg:hidden">Logs</span>
        <div className="flex min-w-0 flex-1 lg:max-w-lg">
          <LogSearchBox logs={logs} search={search} />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 shrink-0 lg:hidden">
              <SlidersHorizontal />
              Filters
              {active > 0 && <span className="mono">{active}</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="top-[6vh] max-h-[86vh] overflow-y-auto p-3">
            <DialogTitle className="px-2 pb-3">Filters</DialogTitle>
            <Facets logs={logs} search={search} counts={counts} />
          </DialogContent>
        </Dialog>
        <span className="lg:ml-auto">
          <RangeMenu logs={logs} search={search} />
        </span>
      </PageBar>
      <div className="flex flex-1 items-start">
        <aside className="sticky top-11 hidden h-[calc(100dvh-2.75rem)] w-60 shrink-0 overflow-y-auto border-r px-2 py-4 lg:block" aria-label="Filters">
          <Facets logs={logs} search={search} counts={counts} />
          {logs.narrowed && (
            <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={logs.clear}>
              Clear filters
            </Button>
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="border-b px-3 py-3 md:px-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <SectionLabel>{search.hour === undefined ? 'Logs per hour' : `${hourLabel(search.hour)} to ${hourLabel(search.hour + 3600)}`}</SectionLabel>
              {counts.total && <span className="mono text-muted-foreground">{counts.total} logs</span>}
            </div>
            <LogHistogram logs={logs} height={64} search={search} pick />
          </div>
          <ActiveFilters logs={logs} search={search} />
          {logs.loading ? (
            <SkeletonRows rows={12} />
          ) : logs.logs.length === 0 ? (
            <Screen title={emptyTitle(logs)} />
          ) : (
            <ul>
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
                        onClick={() => logs.set({ log: current ? undefined : log.id })}
                        className={cn('mono grid w-full cursor-pointer grid-cols-[auto_16px_minmax(0,1fr)_16px] items-start gap-x-3 px-3 py-2 text-left md:px-4 lg:grid-cols-[104px_16px_minmax(0,1fr)]', current ? 'bg-selected' : 'hover:bg-accent/60')}
                      >
                        <span className="text-muted-foreground tabular-nums">{clockTime(log.timestamp)}</span>
                        <LogLevelGlyph level={log.level} className="mt-1" />
                        <span className="min-w-0 max-lg:col-span-4 max-lg:row-start-2 max-lg:mt-1">
                          <span className="block break-words whitespace-pre-wrap">{log.body}</span>
                          <span className="mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
                            <span>{[log.service, log.host].filter(Boolean).join(' · ')}</span>
                            {preview(log).map(([key, value]) => (
                              <span key={key} className="max-lg:hidden">
                                {key}=<span className="text-foreground/80">{String(value)}</span>
                              </span>
                            ))}
                          </span>
                        </span>
                        <ChevronDown className={cn('mt-0.5 size-4 text-muted-foreground transition-transform duration-150 max-lg:col-start-4 max-lg:row-start-1 lg:hidden', current && 'rotate-180')} />
                      </button>
                      {current && (
                        <div className="border-t bg-card px-3 py-3 lg:hidden">
                          <Actions log={log} logs={logs} search={search} />
                          <LogFields log={log} project={logs.projectOf(log)} className="mt-3 border-t" plain />
                          <Trace log={log} />
                        </div>
                      )}
                    </li>
                  </Fragment>
                )
              })}
            </ul>
          )}
          <LoadMore logs={logs} />
        </div>
        {open && (
          <aside aria-label="Log" className="sticky top-11 hidden h-[calc(100dvh-2.75rem)] w-[420px] shrink-0 overflow-y-auto border-l lg:block">
            <div className="sticky top-0 flex h-11 items-center gap-2 border-b bg-card px-4">
              <LogLevelGlyph level={open.level} />
              <span className="mono font-semibold">{open.level}</span>
              <span className="mono truncate text-muted-foreground">{fullTime(open.timestamp)}</span>
              <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close" onClick={() => logs.set({ log: undefined })}>
                <X />
              </Button>
            </div>
            <div className="px-4 py-4">
              <p className="mono mb-4 break-words whitespace-pre-wrap">{open.body}</p>
              <Actions log={open} logs={logs} search={search} />
              <SectionLabel className="mt-6">Fields</SectionLabel>
              <LogFields log={open} project={logs.projectOf(open)} className="mt-1 border-t" plain />
              <Trace log={open} />
            </div>
          </aside>
        )}
      </div>
    </>
  )
}
