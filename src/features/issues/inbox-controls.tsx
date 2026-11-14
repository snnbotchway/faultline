import { ArrowDownWideNarrow, CalendarDays, ChevronDown, Search } from 'lucide-react'
import { useState, type FormEvent, type RefObject } from 'react'
import type { IssueSort } from '@/api/issues'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import { DEFAULT_SORT, SORTS, TIME_RANGES, rangeStart, timeRange, type InboxSearch } from './search'
import { STATUS_VIEWS, type StatusView } from './status'

const isSort = (value: string): value is IssueSort => SORTS.some((sort) => sort.value === value)
const isView = (value: string): value is StatusView => STATUS_VIEWS.some((item) => item.view === value)

export function SearchBox({ query, inputRef, onSubmit }: { query: string; inputRef: RefObject<HTMLInputElement | null>; onSubmit: (query: string) => void }) {
  const [text, setText] = useState(query)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(text.trim())
  }
  return (
    <form onSubmit={submit} role="search" className="flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-2.5 focus-within:border-brand max-lg:h-9">
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Search issues"
        spellCheck={false}
        autoCapitalize="off"
        className="mono h-full min-w-0 flex-1 bg-transparent touch-input outline-none focus-visible:outline-none"
      />
      <Kbd>/</Kbd>
    </form>
  )
}

export function StatusTabs({ view, onChange }: { view: StatusView; onChange: (view: StatusView) => void }) {
  return (
    <nav className="flex h-full items-stretch gap-4 max-lg:hidden" aria-label="Status">
      {STATUS_VIEWS.map((item) => (
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

const CHIP = 'flex h-9 shrink-0 items-center gap-1.5 border bg-card px-2.5 text-sm'

// The status tabs as one control, for the phone's filter row.
export function StatusMenu({ view, onChange }: { view: StatusView; onChange: (view: StatusView) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={CHIP} aria-label="Status">
        {STATUS_VIEWS.find((item) => item.view === view)?.label}
        <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={view} onValueChange={(value) => isView(value) && onChange(value)}>
          {STATUS_VIEWS.map((item) => (
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
  const current = sort ?? DEFAULT_SORT
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-lg:size-11 max-lg:px-0" aria-label="Sort" disabled={disabled}>
          <ArrowDownWideNarrow />
          <span className="max-lg:hidden">{SORTS.find((item) => item.value === current)?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={(value) => isSort(value) && onChange(value === DEFAULT_SORT ? undefined : value)}>
          {SORTS.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const ANY_TIME = '0'

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
  const range = timeRange(search)
  // The backend filters the range on when an issue was first seen, not on recent activity.
  const label = `First seen: ${range.label}`
  const custom = range.days === undefined && (search.start !== undefined || search.end !== undefined)
  return (
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
        <DropdownMenuLabel>First seen</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={custom ? '' : String(range.days ?? ANY_TIME)}
          onValueChange={(value) => onChange({ start: value === ANY_TIME ? undefined : rangeStart(Number(value)), end: undefined })}
        >
          <DropdownMenuRadioItem value={ANY_TIME}>Any time</DropdownMenuRadioItem>
          {TIME_RANGES.map((item) => (
            <DropdownMenuRadioItem key={item.days} value={String(item.days)}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
