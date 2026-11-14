// PROTOTYPE, throwaway. Logs variant B, "Stream and facets": every value you can narrow by stays on screen
// in a rail with its count, the histogram picks an hour, and a log unfolds in place with its message whole.
import { Check, ChevronDown, Copy, SlidersHorizontal, Waypoints } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { LogResourceType, type LogEvent } from '@/api/logs'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ActiveFilters } from './logs-a'
import { LevelRows, LoadMore, LogFields, LogHistogram, LogLevelGlyph, LogSearchBox, RangeMenu, clockTime, dayOf, emptyTitle, hourLabel, useLogs, type LogSearch, type Logs } from './logs-shared'
import { SectionLabel, SkeletonRows } from './shared'

function Facet({ label, values, current, onPick }: { label: string; values: string[]; current?: string; onPick: (value?: string) => void }) {
  if (values.length === 0) return null
  return (
    <section className="mt-4">
      <SectionLabel className="px-2">{label}</SectionLabel>
      <ul className="mt-1">
        {values.map((value) => (
          <li key={value}>
            <button
              type="button"
              role="radio"
              aria-checked={value === current}
              onClick={() => onPick(value === current ? undefined : value)}
              className={cn('mono flex h-8 w-full cursor-pointer items-center gap-2 px-2 text-left hover:bg-accent max-lg:h-11', value === current && 'bg-selected')}
            >
              <span className="truncate">{value}</span>
              <Check className={cn('ml-auto size-3.5 shrink-0', value !== current && 'invisible')} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Facets({ logs, search }: { logs: Logs; search: LogSearch }) {
  return (
    <>
      <section>
        <SectionLabel className="px-2">Level</SectionLabel>
        <div className="mt-1">
          <LevelRows logs={logs} search={search} />
        </div>
      </section>
      <Facet label="Service" values={logs.resourcesOf(LogResourceType.service)} current={search.service} onPick={(service) => logs.set({ service, log: undefined })} />
      <Facet label="Environment" values={logs.resourcesOf(LogResourceType.environment)} current={search.environment} onPick={(environment) => logs.set({ environment, log: undefined })} />
      <Facet label="Host" values={logs.resourcesOf(LogResourceType.host)} current={search.host} onPick={(host) => logs.set({ host, log: undefined })} />
    </>
  )
}

const PREVIEW = 3
const preview = (log: LogEvent) =>
  Object.entries(log.data ?? {})
    .filter(([key]) => !key.startsWith('sentry.'))
    .slice(0, PREVIEW)

function Unfolded({ log, logs, search }: { log: LogEvent; logs: Logs; search: LogSearch }) {
  const narrow = (label: ReactNode, patch: Partial<LogSearch>) => (
    <Button size="sm" className="max-lg:h-11" onClick={() => logs.set({ ...patch, log: undefined })}>
      {label}
    </Button>
  )
  return (
    <div className="border-t bg-card px-3 py-3 md:px-4 lg:pl-[136px]">
      <div className="flex flex-wrap gap-2">
        {log.traceID &&
          narrow(
            <>
              <Waypoints />
              Logs in this trace
            </>,
            { traceId: log.traceID, query: undefined, level: undefined, hour: undefined },
          )}
        {log.service && search.service !== log.service && narrow(<span className="mono">only {log.service}</span>, { service: log.service })}
        {log.host && search.host !== log.host && narrow(<span className="mono">only {log.host}</span>, { host: log.host })}
        <Button size="sm" className="max-lg:h-11" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(log, null, 2))}>
          <Copy />
          Copy
        </Button>
      </div>
      <LogFields log={log} project={logs.projectOf(log)} className="mt-3 max-w-3xl border-t" />
      {log.traceID && (
        <p className="mono mt-2 break-all text-muted-foreground">
          trace {log.traceID}
          {log.spanID ? ` · span ${log.spanID}` : ''}
        </p>
      )}
    </div>
  )
}

export function LogsB({ org, search }: { org: string; search: LogSearch }) {
  const logs = useLogs(org, search)
  const count = (search.level?.length ?? 0) + [search.service, search.environment, search.host].filter(Boolean).length
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
              {count > 0 && <span className="mono">{count}</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="top-[6vh] max-h-[86vh] overflow-y-auto p-3">
            <DialogTitle className="px-2 pb-3">Filters</DialogTitle>
            <Facets logs={logs} search={search} />
          </DialogContent>
        </Dialog>
        <span className="lg:ml-auto">
          <RangeMenu logs={logs} search={search} />
        </span>
      </PageBar>
      <div className="flex flex-1 items-start">
        <aside className="sticky top-11 hidden h-[calc(100dvh-2.75rem)] w-56 shrink-0 overflow-y-auto border-r px-2 py-4 lg:block" aria-label="Filters">
          <Facets logs={logs} search={search} />
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
              {logs.hits && <span className="mono text-muted-foreground">{logs.hits} logs</span>}
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
                const open = log.id === search.log
                const newDay = index === 0 || dayOf(log.timestamp) !== dayOf(logs.logs[index - 1]!.timestamp)
                return (
                  <Fragment key={log.id}>
                    {newDay && <li className="label-caps border-b bg-muted/60 px-3 py-1 md:px-4">{dayOf(log.timestamp)}</li>}
                    <li className="border-b">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => logs.set({ log: open ? undefined : log.id })}
                        className={cn('mono grid w-full cursor-pointer grid-cols-[auto_16px_minmax(0,1fr)_16px] items-start gap-x-3 px-3 py-2 text-left md:px-4 lg:grid-cols-[104px_16px_minmax(0,1fr)_16px]', open ? 'bg-selected' : 'hover:bg-accent/60')}
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
                        <ChevronDown className={cn('mt-0.5 size-4 text-muted-foreground transition-transform duration-150 max-lg:col-start-4 max-lg:row-start-1', open && 'rotate-180')} />
                      </button>
                      {open && <Unfolded log={log} logs={logs} search={search} />}
                    </li>
                  </Fragment>
                )
              })}
            </ul>
          )}
          <LoadMore logs={logs} />
        </div>
      </div>
    </>
  )
}
