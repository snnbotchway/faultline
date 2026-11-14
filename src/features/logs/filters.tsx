import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { hourLabel } from '@/features/issues/format'
import { hitsText } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Uncounted, type Count, type Counts, type Logs } from './data'
import { LogLevelGlyph } from './level'
import { LEVELS, hourEnd, toggleLevel, type LogSearch, type SetSearch } from './search'

const ROW = 'mono flex h-8 w-full items-center gap-2 px-2 text-left hover:bg-accent max-lg:h-11'

// A filter value's count: a placeholder while it loads, a dash where it cannot be counted.
function CountLabel({ count }: { count: Count }) {
  if (count === undefined) return <Skeleton className="h-3 w-6" />
  if (count === Uncounted.unavailable)
    return (
      <span title="Not counted" aria-label="not counted">
        –
      </span>
    )
  return hitsText(count)
}

function FilterValue({ role, on, count, onClick, children }: { role: 'checkbox' | 'radio'; on: boolean; count: Count; onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button type="button" role={role} aria-checked={on} onClick={onClick} className={cn(ROW, on && 'bg-selected font-semibold')}>
        {children}
        <span className={cn('ml-auto shrink-0 tabular-nums', !on && 'text-muted-foreground')}>
          <CountLabel count={count} />
        </span>
        <Check className={cn('size-3 shrink-0', !on && 'invisible')} />
      </button>
    </li>
  )
}

function Facet({ label, items, counts, current, onPick }: { label: string; items: { value: string; label: string }[]; counts: Record<string, Count>; current: string | undefined; onPick: (value: string | undefined) => void }) {
  if (items.length === 0) return null
  return (
    <section className="mt-4" role="radiogroup" aria-label={label}>
      <h2 className="label-caps px-2">{label}</h2>
      <ul className="mt-1">
        {items.map((item) => {
          const on = item.value === current
          return (
            <FilterValue key={item.value} role="radio" on={on} count={counts[item.value]} onClick={() => onPick(on ? undefined : item.value)}>
              <span className="truncate">{item.label}</span>
            </FilterValue>
          )
        })}
      </ul>
    </section>
  )
}

const asItems = (values: string[]) => values.map((value) => ({ value, label: value }))

// Everything the list can be narrowed by, each value with how many logs it would leave.
export function Facets({ logs, search, counts, set }: { logs: Logs; search: LogSearch; counts: Counts; set: SetSearch }) {
  return (
    <>
      <section role="group" aria-label="Level">
        <h2 className="label-caps px-2">Level</h2>
        <ul className="mt-1">
          {LEVELS.map((level) => (
            <FilterValue key={level} role="checkbox" on={!!search.level?.includes(level)} count={counts.level(level)} onClick={() => set({ level: toggleLevel(search, level), log: undefined })}>
              <LogLevelGlyph level={level} />
              <span>{level}</span>
            </FilterValue>
          ))}
        </ul>
      </section>
      <Facet label="Service" items={asItems(logs.services)} counts={counts.service} current={search.service} onPick={(service) => set({ service, log: undefined })} />
      <Facet label="Environment" items={asItems(logs.environments)} counts={counts.environment} current={search.environment} onPick={(environment) => set({ environment, log: undefined })} />
      <Facet label="Host" items={asItems(logs.hosts)} counts={counts.host} current={search.host} onPick={(host) => set({ host, log: undefined })} />
      <Facet
        label="Project"
        items={logs.projects.map((project) => ({ value: String(project.id), label: project.slug ?? String(project.id) }))}
        counts={counts.project}
        current={search.project?.[0] === undefined ? undefined : String(search.project[0])}
        onPick={(project) => set({ project: project === undefined ? undefined : [Number(project)], log: undefined })}
      />
    </>
  )
}

const SHORT_ID = 8

// The filters in force, each removable. One row that scrolls sideways. A desktop shows the ones its
// rail of filters does not already mark.
export function ActiveFilters({ logs, search, set }: { logs: Logs; search: LogSearch; set: SetSearch }) {
  const chips: { label: string; value: string; clear: Partial<LogSearch>; inRail?: boolean }[] = [
    ...(search.traceId ? [{ label: 'trace', value: search.traceId.slice(0, SHORT_ID), clear: { traceId: undefined, spanId: undefined } }] : []),
    ...(search.spanId ? [{ label: 'span', value: search.spanId.slice(0, SHORT_ID), clear: { spanId: undefined } }] : []),
    ...(search.hour === undefined ? [] : [{ label: 'hour', value: `${hourLabel(search.hour)} to ${hourLabel(hourEnd(search.hour))}`, clear: { hour: undefined } }]),
    ...(search.level ?? []).map((level) => ({ label: 'level', value: level, clear: { level: toggleLevel(search, level) }, inRail: true })),
    ...(search.service ? [{ label: 'service', value: search.service, clear: { service: undefined }, inRail: true }] : []),
    ...(search.environment ? [{ label: 'environment', value: search.environment, clear: { environment: undefined }, inRail: true }] : []),
    ...(search.host ? [{ label: 'host', value: search.host, clear: { host: undefined }, inRail: true }] : []),
    ...(search.project ?? []).map((id) => ({
      label: 'project',
      value: logs.projects.find((project) => Number(project.id) === id)?.slug ?? String(id),
      clear: { project: undefined },
      inRail: true,
    })),
  ]
  if (chips.length === 0) return null
  return (
    <ul className={cn('flex gap-2 overflow-x-auto border-b px-3 py-2 [scrollbar-width:none] md:px-4', chips.every((chip) => chip.inRail) && 'lg:hidden')} aria-label="Filters in force">
      {chips.map((chip) => (
        <li key={`${chip.label} ${chip.value}`} className={cn('shrink-0', chip.inRail && 'lg:hidden')}>
          <button
            type="button"
            onClick={() => set({ ...chip.clear, log: undefined })}
            aria-label={`Remove ${chip.label} ${chip.value}`}
            className="mono flex h-7 items-center gap-2 border bg-card px-2 hover:bg-accent max-lg:h-11"
          >
            <span className="text-muted-foreground">{chip.label}</span>
            <span className="max-w-40 truncate">{chip.value}</span>
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  )
}
