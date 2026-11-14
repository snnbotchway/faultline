// PROTOTYPE, throwaway. Logs variant C, "Patterns": messages that differ only in their numbers and ids
// collapse into one row with a count and a trace on a shared time axis, so the unusual lines stand out.
// A pattern unfolds into its logs, and a log into its fields.
import { ChevronDown, Waypoints } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LogLevel, type LogEvent } from '@/api/logs'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { ago } from '@/features/issues/format'
import { Trace } from '@/features/issues/trace'
import { cn } from '@/lib/utils'
import { ActiveFilters } from './logs-a'
import { LEVELS, LevelMenu, LoadMore, LogFields, LogLevelGlyph, LogSearchBox, RangeMenu, ServiceMenu, clockTime, emptyTitle, hourLabel, useLogs, type LogSearch, type Logs } from './logs-shared'
import { SkeletonRows } from './shared'

const MASK = '*'

// The message with its variable parts blanked: ids, references and numbers (three-digit numbers stay, so
// a 200 and a 500 are different patterns).
export function patternOf(body: string) {
  return body
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, MASK)
    .replace(/\b[A-Z]{2,}-\d+\b/g, MASK)
    .replace(/\b[0-9a-f]{16,}\b/gi, MASK)
    .replace(/\b\d+(?:\.\d+)?(ms|s)\b/g, `${MASK}$1`)
    .replace(/\b(?!\d{3}\b)\d+(?:\.\d+)?\b/g, MASK)
}

type Pattern = { key: string; text: string; level: string; service: string | null; logs: LogEvent[]; buckets: number[] }
const MAX_BARS = 28
const severity = (level: string) => {
  const index = LEVELS.findIndex((item) => item === level)
  return index === -1 ? LEVELS.length : index
}

function usePatterns(logs: Logs) {
  return useMemo(() => {
    const size = Math.ceil(logs.buckets.length / MAX_BARS) * 3600
    const start = logs.buckets[0]!.start
    const count = Math.ceil((logs.buckets.length * 3600) / size)
    const patterns = new Map<string, Pattern>()
    for (const log of logs.logs) {
      const masked = patternOf(log.body)
      const key = `${log.level} ${log.service} ${masked}`
      const pattern = patterns.get(key) ?? { key, text: masked, level: log.level, service: log.service, logs: [], buckets: Array.from({ length: count }, () => 0) }
      pattern.logs.push(log)
      const index = Math.floor((Date.parse(log.timestamp) / 1000 - start) / size)
      if (index >= 0 && index < count) pattern.buckets[index]! += 1
      patterns.set(key, pattern)
    }
    return { patterns: [...patterns.values()].sort((a, b) => severity(a.level) - severity(b.level) || b.logs.length - a.logs.length), start }
  }, [logs.logs, logs.buckets])
}

const COLUMNS = 'lg:grid-cols-[16px_minmax(0,1fr)_128px_64px_240px_48px_16px]'

function Masked({ text }: { text: string }) {
  return (
    <>
      {text.split(MASK).map((part, index) => (
        <span key={index}>
          {index > 0 && <span className="text-muted-foreground">{MASK}</span>}
          {part}
        </span>
      ))}
    </>
  )
}

function Occurrences({ pattern, logs, search }: { pattern: Pattern; logs: Logs; search: LogSearch }) {
  const [shown, setShown] = useState(8)
  return (
    <ul className="border-t bg-card">
      {pattern.logs.slice(0, shown).map((log) => {
        const open = log.id === search.log
        return (
          <li key={log.id} className="border-b last:border-b-0">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => logs.set({ log: open ? undefined : log.id })}
              className={cn('mono grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-3 py-2 text-left md:px-4 lg:grid-cols-[104px_minmax(0,1fr)] lg:pl-11', open ? 'bg-selected' : 'hover:bg-accent/60')}
            >
              <span className="text-muted-foreground tabular-nums">{clockTime(log.timestamp)}</span>
              <span className={cn('min-w-0 break-words', !open && 'truncate')}>{log.body}</span>
            </button>
            {open && (
              <div className="px-3 pb-3 md:px-4 lg:pl-[164px]">
                {log.traceID && (
                  <Button size="sm" className="mt-1 max-lg:h-11" onClick={() => logs.set({ traceId: log.traceID ?? undefined, query: undefined, level: undefined, log: undefined })}>
                    <Waypoints />
                    Logs in this trace
                  </Button>
                )}
                <LogFields log={log} project={logs.projectOf(log)} className="mt-2 max-w-3xl border-t" />
              </div>
            )}
          </li>
        )
      })}
      {pattern.logs.length > shown && (
        <li className="px-3 py-2 md:px-4 lg:pl-11">
          <Button variant="ghost" size="sm" className="max-lg:h-11" onClick={() => setShown(shown + 20)}>
            Show {Math.min(20, pattern.logs.length - shown)} more
          </Button>
        </li>
      )}
    </ul>
  )
}

export function LogsC({ org, search }: { org: string; search: LogSearch }) {
  const logs = useLogs(org, search)
  const { patterns, start } = usePatterns(logs)
  const holder = patterns.find((pattern) => pattern.logs.some((log) => log.id === search.log))
  const [unfolded, setUnfolded] = useState<string>()
  const openKey = unfolded ?? holder?.key
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
      </PageBar>
      <ActiveFilters logs={logs} search={search} />
      <div className={cn('sticky top-11 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b bg-background px-3 py-1.5 md:px-4', COLUMNS)}>
        <span className="max-lg:hidden" />
        <span className="label-caps">
          {patterns.length} patterns in {logs.logs.length} of {logs.hits ?? logs.logs.length} logs
        </span>
        <span className="label-caps max-lg:hidden">Service</span>
        <span className="label-caps text-right">Logs</span>
        <span className="mono flex justify-between text-xs text-muted-foreground max-lg:hidden" aria-hidden>
          <span>{hourLabel(start)}</span>
          <span>Now</span>
        </span>
        <span className="label-caps text-right max-lg:hidden">Last</span>
        <span className="max-lg:hidden" />
      </div>
      {logs.loading ? (
        <SkeletonRows rows={12} />
      ) : patterns.length === 0 ? (
        <Screen title={emptyTitle(logs)} />
      ) : (
        <ul>
          {patterns.map((pattern) => {
            const open = pattern.key === openKey
            const loud = pattern.level === LogLevel.error || pattern.level === LogLevel.fatal
            return (
              <li key={pattern.key} className="border-b">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => {
                    setUnfolded(open ? '' : pattern.key)
                    if (search.log) logs.set({ log: undefined })
                  }}
                  className={cn('grid w-full cursor-pointer grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 text-left md:px-4 lg:py-2', COLUMNS, open ? 'bg-accent' : 'hover:bg-accent/60')}
                >
                  <LogLevelGlyph level={pattern.level} />
                  <span className={cn('mono min-w-0 truncate max-lg:line-clamp-2 max-lg:whitespace-normal max-lg:break-words', loud && 'font-semibold')}>
                    <Masked text={pattern.text} />
                  </span>
                  <span className="mono truncate text-muted-foreground max-lg:hidden">{pattern.service}</span>
                  <span className="mono text-right font-semibold tabular-nums">{pattern.logs.length}</span>
                  <Trace buckets={pattern.buckets} height={20} className="max-lg:hidden" />
                  <span className="mono text-right text-muted-foreground max-lg:hidden">{ago(pattern.logs[0]!.timestamp)}</span>
                  <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-150 max-lg:hidden', open && 'rotate-180')} />
                  <span className="mono col-span-2 col-start-2 mt-0.5 text-muted-foreground lg:hidden">
                    {pattern.service} · {ago(pattern.logs[0]!.timestamp)} ago
                  </span>
                </button>
                {open && <Occurrences pattern={pattern} logs={logs} search={search} />}
              </li>
            )
          })}
        </ul>
      )}
      <LoadMore logs={logs} />
    </>
  )
}
