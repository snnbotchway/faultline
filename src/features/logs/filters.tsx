import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { projectSlug } from '@/api/organizations'
import { CountLabel } from '@/components/count-label'
import { hourLabel } from '@/features/issues/format'
import { useT } from '@/i18n'
import { LOADING, type Count } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Counts, Logs } from './data'
import { LogLevelGlyph } from './level'
import { LEVELS, hourEnd, toggleLevel, type LogSearch, type SetSearch } from './search'

const ROW = 'mono flex h-8 w-full items-center gap-2 px-2 text-left hover:bg-accent max-lg:h-11'

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
            <FilterValue key={item.value} role="radio" on={on} count={counts[item.value] ?? LOADING} onClick={() => onPick(on ? undefined : item.value)}>
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
  const t = useT()
  const names = t.logs.facets
  return (
    <>
      <section role="group" aria-label={names.level}>
        <h2 className="label-caps px-2">{names.level}</h2>
        <ul className="mt-1">
          {LEVELS.map((level) => (
            <FilterValue key={level} role="checkbox" on={!!search.level?.includes(level)} count={counts.level(level)} onClick={() => set({ level: toggleLevel(search, level), log: undefined })}>
              <LogLevelGlyph level={level} />
              <span>{level}</span>
            </FilterValue>
          ))}
        </ul>
      </section>
      <Facet label={names.service} items={asItems(logs.services)} counts={counts.service} current={search.service} onPick={(service) => set({ service, log: undefined })} />
      <Facet label={names.environment} items={asItems(logs.environments)} counts={counts.environment} current={search.environment} onPick={(environment) => set({ environment, log: undefined })} />
      <Facet label={names.host} items={asItems(logs.hosts)} counts={counts.host} current={search.host} onPick={(host) => set({ host, log: undefined })} />
      <Facet
        label={t.common.project}
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
  const t = useT().logs
  const names = t.fieldNames
  const chips: { label: string; value: string; clear: Partial<LogSearch>; inRail?: boolean }[] = [
    ...(search.traceId ? [{ label: names.trace, value: search.traceId.slice(0, SHORT_ID), clear: { traceId: undefined, spanId: undefined } }] : []),
    ...(search.spanId ? [{ label: names.span, value: search.spanId.slice(0, SHORT_ID), clear: { spanId: undefined } }] : []),
    ...(search.hour === undefined ? [] : [{ label: names.hour, value: t.hourRange(hourLabel(search.hour), hourLabel(hourEnd(search.hour))), clear: { hour: undefined } }]),
    ...(search.level ?? []).map((level) => ({ label: names.level, value: level, clear: { level: toggleLevel(search, level) }, inRail: true })),
    ...(search.service ? [{ label: names.service, value: search.service, clear: { service: undefined }, inRail: true }] : []),
    ...(search.environment ? [{ label: names.environment, value: search.environment, clear: { environment: undefined }, inRail: true }] : []),
    ...(search.host ? [{ label: names.host, value: search.host, clear: { host: undefined }, inRail: true }] : []),
    ...(search.project ?? []).map((id) => ({
      label: names.project,
      value: projectSlug(logs.projects, id) ?? String(id),
      clear: { project: undefined },
      inRail: true,
    })),
  ]
  if (chips.length === 0) return null
  return (
    <ul className={cn('scroll-row flex gap-2 border-b px-3 py-2 md:px-4', chips.every((chip) => chip.inRail) && 'lg:hidden')} aria-label={t.filtersInForce}>
      {chips.map((chip) => (
        <li key={`${chip.label} ${chip.value}`} className={cn('shrink-0', chip.inRail && 'lg:hidden')}>
          <button
            type="button"
            onClick={() => set({ ...chip.clear, log: undefined })}
            aria-label={t.removeFilter(chip.label, chip.value)}
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
