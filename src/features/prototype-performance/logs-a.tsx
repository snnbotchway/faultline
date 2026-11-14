// PROTOTYPE, throwaway. Logs variant A, "Table and panel": one line per log under a bar of filters; the
// open log sits in a panel beside the table (a full screen on a phone).
import { Link } from '@tanstack/react-router'
import { Copy, Waypoints, X } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'
import type { LogEvent } from '@/api/logs'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { useHotkeys } from '@/lib/hotkeys'
import { cn } from '@/lib/utils'
import { LevelMenu, LoadMore, LogFields, LogHistogram, LogLevelGlyph, LogSearchBox, RangeMenu, ServiceMenu, clockTime, dayOf, emptyTitle, fullTime, useLogs, type LogSearch, type Logs } from './logs-shared'
import { SectionLabel, SkeletonRows } from './shared'

const COLUMNS = 'lg:grid-cols-[104px_16px_128px_minmax(0,1fr)]'

export function ActiveFilters({ logs, search }: { logs: Logs; search: LogSearch }) {
  if (!search.traceId && !search.host && !search.environment) return null
  const chip = (label: string, value: string, clear: Partial<LogSearch>) => (
    <button key={label} type="button" onClick={() => logs.set(clear)} className="mono flex h-7 cursor-pointer items-center gap-1.5 border bg-card px-2 hover:bg-accent max-lg:h-9">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-40 truncate">{value}</span>
      <X className="size-3" />
    </button>
  )
  return (
    <div className="flex flex-wrap gap-1.5 border-b px-3 py-2 md:px-4">
      {search.traceId && chip('trace', search.traceId.slice(0, 8), { traceId: undefined })}
      {search.host && chip('host', search.host, { host: undefined })}
      {search.environment && chip('environment', search.environment, { environment: undefined })}
    </div>
  )
}

export function LogPanel({ log, logs, onClose }: { log: LogEvent; logs: Logs; onClose: () => void }) {
  return (
    <>
      <div className="sticky top-0 flex h-11 items-center gap-2 border-b bg-card px-3 md:px-4">
        <LogLevelGlyph level={log.level} />
        <span className="mono font-semibold">{log.level}</span>
        <span className="mono truncate text-muted-foreground">{fullTime(log.timestamp)}</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto max-lg:size-11" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="px-3 py-4 md:px-4">
        <p className="mono break-words whitespace-pre-wrap">{log.body}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {log.traceID && (
            <Button size="sm" className="max-lg:h-11" onClick={() => logs.set({ traceId: log.traceID ?? undefined, query: undefined, level: undefined, hour: undefined })}>
              <Waypoints />
              Logs in this trace
            </Button>
          )}
          <Button size="sm" className="max-lg:h-11" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(log, null, 2))}>
            <Copy />
            Copy
          </Button>
        </div>
        <SectionLabel className="mt-6">Fields</SectionLabel>
        <LogFields log={log} project={logs.projectOf(log)} className="mt-1 border-t" />
        {log.traceID && (
          <>
            <SectionLabel className="mt-6">Trace</SectionLabel>
            <p className="mono mt-1 break-all">{log.traceID}</p>
            {log.spanID && <p className="mono break-all text-muted-foreground">span {log.spanID}</p>}
          </>
        )}
      </div>
    </>
  )
}

export function LogsA({ org, search }: { org: string; search: LogSearch }) {
  const logs = useLogs(org, search)
  const open = logs.logs.find((log) => log.id === search.log)
  const current = useRef<HTMLLIElement>(null)
  useEffect(() => current.current?.scrollIntoView({ block: 'nearest' }), [search.log])
  const move = (step: number) => {
    const index = logs.logs.findIndex((log) => log.id === search.log)
    const next = logs.logs[Math.max(0, Math.min(logs.logs.length - 1, index + step))]
    if (next) logs.set({ log: next.id })
  }
  useHotkeys({ j: () => move(1), k: () => move(-1), Escape: () => logs.set({ log: undefined }) })
  return (
    <>
      <PageBar className="max-lg:h-auto max-lg:flex-wrap max-lg:gap-x-2 max-lg:gap-y-2 max-lg:py-2">
        <span className="shrink-0 font-semibold max-lg:hidden">Logs</span>
        <div className="flex min-w-0 flex-1 max-lg:w-full max-lg:flex-none lg:max-w-md">
          <LogSearchBox logs={logs} search={search} />
        </div>
        <LevelMenu logs={logs} search={search} />
        <ServiceMenu logs={logs} search={search} />
        <span className="lg:ml-auto">
          <RangeMenu logs={logs} search={search} />
        </span>
        {logs.narrowed && (
          <Button variant="ghost" size="sm" className="max-lg:h-9" onClick={logs.clear}>
            Clear
          </Button>
        )}
      </PageBar>
      <div className="flex flex-1 items-start">
        <div className="min-w-0 flex-1">
          <div className="border-b px-3 py-3 md:px-4">
            <LogHistogram logs={logs} height={40} search={search} />
          </div>
          <ActiveFilters logs={logs} search={search} />
          <div className={cn('sticky top-11 z-10 hidden items-end gap-3 border-b bg-background px-4 py-1.5 lg:grid', COLUMNS)}>
            <span className="label-caps">Time</span>
            <span />
            <span className="label-caps">Service</span>
            <span className="flex items-baseline justify-between">
              <span className="label-caps">Message</span>
              {logs.hits && <span className="mono text-muted-foreground">{logs.hits} logs</span>}
            </span>
          </div>
          {logs.loading ? (
            <SkeletonRows rows={12} />
          ) : logs.logs.length === 0 ? (
            <Screen title={emptyTitle(logs)} />
          ) : (
            <ul>
              {logs.logs.map((log, index) => {
                const selected = log.id === search.log
                const newDay = index === 0 || dayOf(log.timestamp) !== dayOf(logs.logs[index - 1]!.timestamp)
                return (
                  <Fragment key={log.id}>
                    {newDay && <li className="label-caps border-b bg-muted/60 px-3 py-1 md:px-4">{dayOf(log.timestamp)}</li>}
                    <li ref={selected ? current : undefined} className="scroll-mt-24 border-b">
                      <Link
                        to="/$org/prototype/logs"
                        params={{ org }}
                        search={{ ...search, log: selected ? undefined : log.id }}
                        replace
                        aria-current={selected ? 'true' : undefined}
                        className={cn('mono grid grid-cols-[auto_16px_minmax(0,1fr)] items-center gap-x-3 px-3 py-2 md:px-4 lg:py-1.5', COLUMNS, selected ? 'bg-selected' : 'hover:bg-accent/60')}
                      >
                        <span className="text-muted-foreground tabular-nums">{clockTime(log.timestamp)}</span>
                        <LogLevelGlyph level={log.level} />
                        <span className="truncate text-muted-foreground">{log.service}</span>
                        <span className="truncate max-lg:col-span-3 max-lg:mt-1 max-lg:line-clamp-2 max-lg:whitespace-normal max-lg:break-words">{log.body}</span>
                      </Link>
                    </li>
                  </Fragment>
                )
              })}
            </ul>
          )}
          <LoadMore logs={logs} />
        </div>
        {open && (
          <aside
            aria-label="Log"
            className="min-w-0 overflow-y-auto bg-background max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:pb-16 lg:sticky lg:top-11 lg:h-[calc(100dvh-2.75rem)] lg:w-[440px] lg:shrink-0 lg:border-l"
          >
            <LogPanel log={open} logs={logs} onClose={() => logs.set({ log: undefined })} />
          </aside>
        )}
      </div>
    </>
  )
}
