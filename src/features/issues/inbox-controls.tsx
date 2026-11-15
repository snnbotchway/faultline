import { ArrowDownWideNarrow, CalendarDays, ChevronDown, CircleHelp, Search } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent, type RefObject } from 'react'
import type { IssueSort } from '@/api/issues'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { useT } from '@/i18n'
import { valueName } from '@/lib/text'
import { cn } from '@/lib/utils'
import { DEFAULT_SORT, SORTS, localToUtc, sortLabel, timeRange, timeRanges, utcToLocal, type InboxSearch } from './search'
import { isView, statusViews, type StatusView } from './status'

const isSort = (value: string): value is IssueSort => SORTS.some((sort) => sort === value)

export function SearchBox({ query, inputRef, onSubmit }: { query: string; inputRef: RefObject<HTMLInputElement | null>; onSubmit: (query: string) => void }) {
  const t = useT().issues.search
  const [text, setText] = useState(query)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(text.trim())
  }
  return (
    <form onSubmit={submit} role="search" className="flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-3 focus-within:border-foreground max-lg:h-11">
      <Search className="size-3 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label={t.label}
        spellCheck={false}
        autoCapitalize="off"
        className="mono h-full min-w-0 flex-1 bg-transparent touch-input outline-none focus-visible:outline-none"
      />
      <SearchHelp />
      <Kbd className="max-lg:hidden">/</Kbd>
    </form>
  )
}

function SearchHelp() {
  const t = useT().issues.search
  // The tokens are the search's own words; only what they mean is translated.
  const syntax = [
    { token: 'is:unresolved', meaning: t.meanings.status },
    { token: 'level:error', meaning: t.meanings.level },
    { token: 'browser:Chrome', meaning: t.meanings.tag },
    { token: 'has:release', meaning: t.meanings.has },
    { token: 'timeout*', meaning: t.meanings.prefix },
  ]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={t.syntax} title={t.syntax} className="grid size-7 shrink-0 place-items-center text-muted-foreground hover:text-foreground max-lg:size-11">
          <CircleHelp className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={t.syntax} className="w-96 max-lg:w-[calc(100vw-1.5rem)]">
        <dl className="mono grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {syntax.map((item) => (
            <div key={item.token} className="contents">
              <dt className="font-semibold">{item.token}</dt>
              <dd className="font-sans text-balance text-muted-foreground">{item.meaning}</dd>
            </div>
          ))}
          <div className="contents">
            <dt className="font-semibold">{t.words}</dt>
            <dd className="font-sans text-balance text-muted-foreground">{t.meanings.text}</dd>
          </div>
        </dl>
        <p className="mt-3 border-t pt-3 text-muted-foreground">{t.rule}</p>
      </PopoverContent>
    </Popover>
  )
}

export function StatusTabs({ view, onChange }: { view: StatusView; onChange: (view: StatusView) => void }) {
  const t = useT().issues
  return (
    <nav className="flex h-full items-stretch gap-4 max-lg:hidden" aria-label={t.status.label}>
      {statusViews().map((item) => (
        <button
          key={item.view}
          type="button"
          aria-current={item.view === view ? 'page' : undefined}
          onClick={() => onChange(item.view)}
          className={cn('border-y-2 border-transparent text-sm font-medium', item.view === view ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

const CHIP = 'flex h-11 shrink-0 items-center gap-2 border bg-card px-3 text-sm'

// The status tabs as one control, for the phone's filter row.
export function StatusMenu({ view, onChange }: { view: StatusView; onChange: (view: StatusView) => void }) {
  const t = useT().issues
  const views = statusViews()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={CHIP} aria-label={t.status.label}>
        {views.find((item) => item.view === view)?.label}
        <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={view} onValueChange={(value) => isView(value) && onChange(value)}>
          {views.map((item) => (
            <DropdownMenuRadioItem key={item.view} value={item.view}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SortMenu({ sort, disabled, onChange }: { sort: IssueSort | undefined; disabled?: boolean; onChange: (sort: IssueSort | undefined) => void }) {
  const t = useT().issues.search
  const current = sort ?? DEFAULT_SORT
  const label = sortLabel(current)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-lg:size-11 max-lg:px-0" aria-label={valueName(t.sort, label)} title={valueName(t.sort, label)} disabled={disabled}>
          <ArrowDownWideNarrow />
          <span className="max-lg:hidden">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={(value) => isSort(value) && onChange(value === DEFAULT_SORT ? undefined : value)}>
          {SORTS.map((item) => (
            <DropdownMenuRadioItem key={item} value={item}>
              {sortLabel(item)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const ANY_TIME = 'any'
const CUSTOM = 'custom'

// Picks how far back to look. Dates that came with the link and fit none of the choices are shown as they are.
export function TimeRangeMenu({
  search,
  chip,
  onChange,
}: {
  search: Pick<InboxSearch, 'start' | 'end'>
  chip?: boolean
  onChange: (range: Pick<InboxSearch, 'start' | 'end'>) => void
}) {
  const t = useT().issues.search
  const [picking, setPicking] = useState(false)
  const range = timeRange(search)
  // The backend filters the range on when an issue was first seen, not on recent activity.
  const label = valueName(t.firstSeen, range.label)
  const custom = range.start === undefined && (search.start !== undefined || search.end !== undefined)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild={!chip} className={chip ? CHIP : undefined} aria-label={label}>
          {chip ? (
            <>
              {label}
              <ChevronDown className="size-3 text-muted-foreground" />
            </>
          ) : (
            <Button variant="ghost" size="sm">
              <CalendarDays />
              {label}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t.firstSeen}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={custom ? CUSTOM : (range.start ?? ANY_TIME)}
            onValueChange={(value) => value !== CUSTOM && onChange({ start: value === ANY_TIME ? undefined : value, end: undefined })}
          >
            <DropdownMenuRadioItem value={ANY_TIME}>{t.anyTime}</DropdownMenuRadioItem>
            {timeRanges().map((item) => (
              <DropdownMenuRadioItem key={item.start} value={item.start}>
                {item.label}
              </DropdownMenuRadioItem>
            ))}
            {custom && <DropdownMenuRadioItem value={CUSTOM}>{range.label}</DropdownMenuRadioItem>}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPicking(true)}>{t.customRange}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {picking && (
        <CustomRange
          search={search}
          onClose={() => setPicking(false)}
          onApply={(next) => {
            onChange(next)
            setPicking(false)
          }}
        />
      )}
    </>
  )
}

const ABSOLUTE = /^\d{4}-\d{2}-\d{2}T/

function CustomRange({ search, onClose, onApply }: { search: Pick<InboxSearch, 'start' | 'end'>; onClose: () => void; onApply: (range: Pick<InboxSearch, 'start' | 'end'>) => void }) {
  const t = useT()
  const w = t.issues.search
  const initial = (value: string | undefined) => (value && ABSOLUTE.test(value) ? utcToLocal(value) : '')
  const [from, setFrom] = useState(initial(search.start))
  const [to, setTo] = useState(initial(search.end))
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({})
  const edit = (set: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    set(event.target.value)
    setErrors({})
  }
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // A date without a time reads as empty, so the field says it is incomplete rather than missing.
    const incomplete = w.incompleteDate
    const badInput = (name: string) => (event.currentTarget.elements.namedItem(name) as HTMLInputElement).validity.badInput
    const [badFrom, badTo] = [badInput('from'), badInput('to')]
    if (badFrom || badTo) return setErrors({ from: badFrom ? incomplete : undefined, to: badTo ? incomplete : undefined })
    if (!from && !to) return setErrors({ from: w.pickOne })
    if (from && to && new Date(from) >= new Date(to)) return setErrors({ to: w.endAfterStart })
    onApply({ start: from ? localToUtc(from) : undefined, end: to ? localToUtc(to) : undefined })
  }
  return (
    <TaskDialog open onClose={onClose} title={w.firstSeenBetween}>
      <form onSubmit={apply} noValidate className="space-y-4">
        <Field label={w.from} error={errors.from}>
          {(props) => <Input {...props} name="from" type="datetime-local" value={from} onChange={edit(setFrom)} />}
        </Field>
        <Field label={w.to} error={errors.to}>
          {(props) => <Input {...props} name="to" type="datetime-local" value={to} onChange={edit(setTo)} />}
        </Field>
        <TaskActions className="sm:justify-end">
          <Button type="submit" variant="default" className="sm:order-2">
            {w.apply}
          </Button>
          <Button type="button" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </TaskActions>
      </form>
    </TaskDialog>
  )
}
