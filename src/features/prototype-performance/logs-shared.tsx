// PROTOTYPE, throwaway. What the three log variants share: URL state, data, the level histogram and small parts.
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CalendarDays, Check, ChevronDown, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { LogLevel, LogResourceType, logListQuery, logResourcesQuery, logStatsQuery, type LogEvent, type LogFilters } from '@/api/logs'
import { projectsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LevelGlyph } from '@/features/issues/level'
import { cn } from '@/lib/utils'
import { variantOf, type Variant } from './shared'

const HOUR = 3600
export const RANGES = [
  { value: '1h', label: 'Last hour', hours: 1 },
  { value: '6h', label: 'Last 6 hours', hours: 6 },
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 168 },
] as const
export type Range = (typeof RANGES)[number]['value']
const DEFAULT_RANGE: Range = '24h'

// Most severe first.
export const LEVELS: LogLevel[] = [LogLevel.fatal, LogLevel.error, LogLevel.warn, LogLevel.info, LogLevel.debug, LogLevel.trace]
const isLevel = (value: unknown): value is LogLevel => LEVELS.some((level) => level === value)
const GLYPH: Record<string, string> = { [LogLevel.warn]: 'warning', [LogLevel.trace]: 'debug' }

export function LogLevelGlyph({ level, className }: { level: string; className?: string }) {
  return <LevelGlyph level={GLYPH[level] ?? level} className={className} />
}

export type LogSearch = {
  variant: Variant
  query?: string
  level?: LogLevel[]
  service?: string
  environment?: string
  host?: string
  traceId?: string
  range?: Range
  // One hour picked on the histogram.
  hour?: number
  log?: string
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

export function validateLogSearch(search: Record<string, unknown>): LogSearch {
  const level = (Array.isArray(search.level) ? search.level : search.level === undefined ? [] : [search.level]).filter(isLevel)
  const hour = Number(search.hour)
  return {
    variant: variantOf(search.variant),
    query: text(search.query),
    level: level.length > 0 ? level : undefined,
    service: text(search.service),
    environment: text(search.environment),
    host: text(search.host),
    traceId: text(search.traceId),
    range: RANGES.find((range) => range.value === search.range && range.value !== DEFAULT_RANGE)?.value,
    hour: search.hour !== undefined && Number.isInteger(hour) ? hour : undefined,
    log: text(search.log),
  }
}

export type Bucket = { start: number; errors: number; warnings: number; other: number }
const total = (bucket: Bucket) => bucket.errors + bucket.warnings + bucket.other

export function useLogs(org: string, search: LogSearch) {
  const navigate = useNavigate()
  const range = RANGES.find((item) => item.value === (search.range ?? DEFAULT_RANGE))!
  const scope: LogFilters = useMemo(
    () => ({ level: search.level, service: search.service, environment: search.environment, start: `now-${range.value}` }),
    [search.level, search.service, search.environment, range.value],
  )
  const filters: LogFilters = useMemo(
    () => ({
      ...scope,
      query: search.query,
      host: search.host,
      traceId: search.traceId,
      ...(search.hour === undefined ? {} : { start: new Date(search.hour * 1000).toISOString(), end: new Date((search.hour + HOUR) * 1000).toISOString() }),
    }),
    [scope, search.query, search.host, search.traceId, search.hour],
  )
  const list = useInfiniteQuery(logListQuery(org, filters))
  const stats = useQuery(logStatsQuery(org, scope))
  const resources = useQuery(logResourcesQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data
  const logs = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data])
  const first = list.data?.pages[0]
  const hits = first?.hits === undefined ? undefined : first.maxHits !== undefined && first.hits >= first.maxHits ? `${first.maxHits}+` : String(first.hits)

  const now = stats.dataUpdatedAt || list.dataUpdatedAt
  const buckets = useMemo(() => {
    const last = Math.floor((now || Date.now()) / 1000 / HOUR) * HOUR
    const filled: Bucket[] = Array.from({ length: range.hours }, (_, index) => ({ start: last - (range.hours - 1 - index) * HOUR, errors: 0, warnings: 0, other: 0 }))
    stats.data?.intervals.forEach((interval, at) => {
      const bucket = filled[Math.round((Date.parse(interval) / 1000 - filled[0]!.start) / HOUR)]
      if (!bucket) return
      for (const series of stats.data.series) {
        const count = series.data[at] ?? 0
        if (series.name === LogLevel.error || series.name === LogLevel.fatal) bucket.errors += count
        else if (series.name === LogLevel.warn) bucket.warnings += count
        else bucket.other += count
      }
    })
    return filled
  }, [stats.data, range.hours, now])
  const levelCounts = useMemo(
    () => Object.fromEntries((stats.data?.series ?? []).map((series) => [series.name, series.data.reduce((sum, count) => sum + count, 0)])) as Partial<Record<LogLevel, number>>,
    [stats.data],
  )

  const set = (patch: Partial<LogSearch>) => void navigate({ to: '/$org/prototype/logs', params: { org }, search: { ...search, ...patch }, replace: true })
  const narrowed = !!(search.query || search.level || search.service || search.environment || search.host || search.traceId || search.hour !== undefined)
  const clear = () => set({ query: undefined, level: undefined, service: undefined, environment: undefined, host: undefined, traceId: undefined, hour: undefined, log: undefined })
  const resourcesOf = (type: LogResourceType) => (resources ?? []).filter((resource) => resource.type === type).map((resource) => resource.name).sort()
  const projectOf = (log: LogEvent) => projects?.find((project) => Number(project.id) === log.projectId)?.slug ?? undefined

  return { list, logs, hits, buckets, levelCounts, range, set, clear, narrowed, resourcesOf, projectOf, loading: list.isPending }
}

export type Logs = ReturnType<typeof useLogs>

const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hour12: false })
const hourMinute = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
export const clockTime = (time: string) => clock.format(new Date(time))
export const dayOf = (time: string) => day.format(new Date(time))
export const fullTime = (time: string) => `${day.format(new Date(time))} ${clock.format(new Date(time))}`
export const hourLabel = (seconds: number) => hourMinute.format(new Date(seconds * 1000))

// Logs per hour, errors and warnings stacked on the rest. One bar per hour is as fine as the backend counts.
export function LogHistogram({ logs, height, search, pick }: { logs: Logs; height: number; search: LogSearch; pick?: boolean }) {
  const { buckets, range } = logs
  const peak = Math.max(1, ...buckets.map(total))
  const px = (count: number) => (count <= 0 ? 0 : Math.max(2, Math.round((count / peak) * height)))
  return (
    <div>
      <div className="flex items-end gap-px border-b border-grid" style={{ height: height + 1 }} role={pick ? 'group' : 'img'} aria-label="Logs per hour">
        {buckets.map((bucket) => {
          const bar = (
            <>
              <span className="w-full bg-foreground/40" style={{ height: px(bucket.other) }} />
              <span className="w-full bg-level-warning" style={{ height: px(bucket.warnings) }} />
              <span className="w-full bg-level-error" style={{ height: px(bucket.errors) }} />
            </>
          )
          const picked = search.hour === bucket.start
          const column = cn('flex min-w-0 flex-1 flex-col-reverse justify-start', search.hour !== undefined && !picked && 'opacity-35')
          return pick ? (
            <button
              key={bucket.start}
              type="button"
              aria-pressed={picked}
              aria-label={`${hourLabel(bucket.start)}, ${total(bucket)} logs`}
              title={`${hourLabel(bucket.start)} · ${total(bucket)} logs`}
              onClick={() => logs.set({ hour: picked ? undefined : bucket.start, log: undefined })}
              className={cn(column, 'h-full cursor-pointer hover:bg-accent')}
            >
              {bar}
            </button>
          ) : (
            <span key={bucket.start} className={column} title={`${hourLabel(bucket.start)} · ${total(bucket)} logs`}>
              {bar}
            </span>
          )
        })}
      </div>
      <div className="mono mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{range.hours > 24 ? dayOf(new Date(buckets[0]!.start * 1000).toISOString()) : hourLabel(buckets[0]!.start)}</span>
        <span>peak {peak}/hour</span>
        <span>Now</span>
      </div>
    </div>
  )
}

export function LogSearchBox({ logs, search }: { logs: Logs; search: LogSearch }) {
  const [value, setValue] = useState(search.query ?? '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    logs.set({ query: value.trim() || undefined, log: undefined })
  }
  return (
    <form onSubmit={submit} role="search" className="flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-2.5 focus-within:border-brand max-lg:h-9">
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input value={value} onChange={(event) => setValue(event.target.value)} aria-label="Search messages" spellCheck={false} autoCapitalize="off" className="mono h-full min-w-0 flex-1 bg-transparent outline-none max-lg:text-[1rem]" />
    </form>
  )
}

const CONTROL = 'shrink-0 gap-1.5 max-lg:h-9'

export function RangeMenu({ logs, search }: { logs: Logs; search: LogSearch }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={CONTROL} aria-label={`Time range: ${logs.range.label}`}>
          <CalendarDays />
          <span className="mono">{logs.range.value}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={logs.range.value} onValueChange={(value) => logs.set({ range: RANGES.find((range) => range.value === value)?.value, hour: undefined, log: search.log })}>
          {RANGES.map((range) => (
            <DropdownMenuRadioItem key={range.value} value={range.value}>
              {range.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function toggleLevel(search: LogSearch, level: LogLevel): LogLevel[] | undefined {
  const next = search.level?.includes(level) ? search.level.filter((item) => item !== level) : [...(search.level ?? []), level]
  return next.length > 0 ? LEVELS.filter((item) => next.includes(item)) : undefined
}

export function LevelRows({ logs, search }: { logs: Logs; search: LogSearch }) {
  return (
    <ul>
      {LEVELS.map((level) => {
        const on = !!search.level?.includes(level)
        return (
          <li key={level}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => logs.set({ level: toggleLevel(search, level), log: undefined })}
              className={cn('flex h-8 w-full cursor-pointer items-center gap-2 px-2 text-left text-sm hover:bg-accent max-lg:h-11', on && 'bg-selected')}
            >
              <LogLevelGlyph level={level} />
              <span className="mono">{level}</span>
              <span className="mono ml-auto text-muted-foreground tabular-nums">{logs.levelCounts[level] ?? 0}</span>
              <Check className={cn('size-3.5', !on && 'invisible')} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function LevelMenu({ logs, search }: { logs: Logs; search: LogSearch }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" className={CONTROL}>
          {search.level ? <span className="mono">{search.level.join(' ')}</span> : 'Level'}
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1">
        <LevelRows logs={logs} search={search} />
      </PopoverContent>
    </Popover>
  )
}

const ANY = ''

export function ServiceMenu({ logs, search }: { logs: Logs; search: LogSearch }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={CONTROL}>
          {search.service ? <span className="mono">{search.service}</span> : 'Service'}
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={search.service ?? ANY} onValueChange={(value) => logs.set({ service: value || undefined, log: undefined })}>
          <DropdownMenuRadioItem value={ANY}>Every service</DropdownMenuRadioItem>
          {logs.resourcesOf(LogResourceType.service).map((service) => (
            <DropdownMenuRadioItem key={service} value={service} className="mono">
              {service}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const shown = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))

// Everything a log carries besides its message: where it came from, then its attributes.
export function LogFields({ log, project, className }: { log: LogEvent; project?: string; className?: string }) {
  const where = [
    ['service', log.service],
    ['environment', log.environment],
    ['host', log.host],
    ['project', project],
  ].filter((field): field is [string, string] => !!field[1])
  const attributes = Object.entries(log.data ?? {}).sort(([a], [b]) => a.localeCompare(b))
  return (
    <dl className={cn('mono grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3', className)}>
      {[...where, ...attributes].map(([key, value]) => (
        <div key={key} className="col-span-2 grid grid-cols-subgrid border-b py-1.5">
          <dt className="break-all text-muted-foreground">{key}</dt>
          <dd className="break-all">{shown(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

export function LoadMore({ logs }: { logs: Logs }) {
  if (!logs.list.hasNextPage) return null
  return (
    <div className="flex justify-center py-4">
      <Button onClick={() => void logs.list.fetchNextPage()} aria-busy={logs.list.isFetchingNextPage} className="max-lg:h-11">
        Load older logs
      </Button>
    </div>
  )
}

export const emptyTitle = (logs: Logs) => (logs.narrowed ? 'No logs match these filters' : `No logs in the ${logs.range.label.toLowerCase()}`)
