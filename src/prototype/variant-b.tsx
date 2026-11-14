// THROWAWAY PROTOTYPE · Variant B "Triage".
// A mail-client split: icon rail, a narrow issue list, and a reading pane that
// follows the cursor, so j/k reads issue after issue without navigating.
// Enter widens the reading pane into focus mode; Esc brings the list back.
import {
  Activity,
  ArrowLeft,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  GitMerge,
  Maximize2,
  Minimize2,
  Moon,
  MoreHorizontal,
  Package,
  ScrollText,
  Search,
  Settings,
  Sun,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EVENTS, EVENT_COUNT, FACETS, ISSUES, ME, ago, eventFor, stamp, type Issue } from './data'
import {
  Bars,
  Checkbox,
  Crumbs,
  ENV_OPTIONS,
  Facets,
  JsonView,
  Kbd,
  KeyValues,
  LevelGlyph,
  Mark,
  Menu,
  ModalPalette,
  PROJECT_OPTIONS,
  StackTrace,
  levelColor,
  useOpenIssue,
} from './shared'
import {
  SORTS,
  act,
  currentStatus,
  set,
  setStatusFilter,
  statusCounts,
  statusOf,
  toggleSelect,
  useKeys,
  useStore,
  visible,
  type Proto,
} from './store'

const NAV = [
  { label: 'Issues', icon: TriangleAlert },
  { label: 'Releases', icon: Package },
  { label: 'Uptime', icon: Activity },
  { label: 'Logs', icon: ScrollText },
  { label: 'Alerts', icon: Bell },
]

function Rail({ proto }: { proto: Proto }) {
  return (
    <nav className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3 max-md:hidden">
      <button onClick={proto.toInbox} aria-label="Faultline" className="mb-3 grid size-8 cursor-pointer place-items-center rounded-md bg-(--brand) text-(--brand-fg)">
        <Mark className="size-[18px]" />
      </button>
      {NAV.map(({ label, icon: Icon }) => (
        <button
          key={label}
          title={label}
          onClick={proto.toInbox}
          className={cn(
            'grid size-9 cursor-pointer place-items-center rounded-md',
            label === 'Issues' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </button>
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        <button
          title="Switch theme"
          onClick={() => proto.setSearch({ theme: proto.dark ? 'light' : 'dark' })}
          className="grid size-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {proto.dark ? <Sun className="size-[18px]" strokeWidth={1.75} /> : <Moon className="size-[18px]" strokeWidth={1.75} />}
        </button>
        <button title="Settings" className="grid size-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
          <Settings className="size-[18px]" strokeWidth={1.75} />
        </button>
        <button title={ME} className="mt-1 grid size-7 cursor-pointer place-items-center rounded-full bg-foreground/10 text-[11px] font-semibold uppercase">
          {ME[0]}
        </button>
      </div>
    </nav>
  )
}

function IconAction({
  label,
  keys,
  onClick,
  children,
  primary,
  on,
}: {
  label: string
  keys?: string
  onClick: () => void
  children: ReactNode
  primary?: boolean
  on?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] font-medium whitespace-nowrap',
        primary ? 'bg-primary text-primary-foreground hover:opacity-90' : 'hover:bg-accent',
        on && 'text-(--brand)',
      )}
    >
      {children}
      <span className="max-lg:hidden">{label}</span>
      {keys && <Kbd className="max-lg:hidden">{keys}</Kbd>}
    </button>
  )
}

function ListPane({ proto }: { proto: Proto }) {
  const s = useStore()
  const list = visible(s)
  const counts = statusCounts(s)
  const status = currentStatus(s)
  const picking = s.selected.length > 0
  return (
    <section className="flex w-full shrink-0 flex-col bg-sidebar md:w-[420px] md:border-r">
      <header className="flex h-12 shrink-0 items-center gap-1 px-2">
        <span className="mx-1 grid size-7 place-items-center rounded-md bg-(--brand) text-(--brand-fg) md:hidden">
          <Mark className="size-4" />
        </span>
        <Menu className="font-semibold" value={s.project ?? ''} options={PROJECT_OPTIONS} onChange={(v) => set({ project: v || null, selected: [] })} />
        <Menu className="text-muted-foreground" value={s.env ?? ''} options={ENV_OPTIONS} onChange={(v) => set({ env: v || null })} />
        <button onClick={() => set({ palette: true })} aria-label="Command palette" className="ml-auto flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Kbd className="max-md:hidden">⌘K</Kbd>
          <Search className="size-4 md:hidden" />
        </button>
      </header>
      <div className="px-3">
        <label className="flex h-8 cursor-text items-center gap-2 rounded-md border bg-background px-2.5 focus-within:border-(--brand)">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            data-search
            value={s.query}
            onChange={(e) => set({ query: e.target.value })}
            spellCheck={false}
            placeholder="Search issues"
            className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] outline-none placeholder:font-sans placeholder:text-muted-foreground"
          />
          <Kbd className="max-md:hidden">/</Kbd>
        </label>
      </div>
      <div className="flex h-10 shrink-0 items-center gap-0.5 border-b px-2">
        {(['unresolved', 'resolved', 'ignored'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setStatusFilter(k)}
            className={cn(
              'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12.5px] capitalize',
              status === k ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {k}
            <span className="font-mono text-[11.5px] text-muted-foreground">{counts[k]}</span>
          </button>
        ))}
        <div className="ml-auto">
          <Menu className="text-[12.5px] text-muted-foreground" value={s.sort} options={SORTS} onChange={(sort) => set({ sort })} align="right" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto max-md:pb-16">
        {list.map((i) => {
          const on = s.selected.includes(i.id)
          const cur = s.cursor === i.id
          return (
            <div
              key={i.id}
              data-row={i.id}
              onClick={() => (window.matchMedia('(min-width: 768px)').matches ? set({ cursor: i.id, eventIndex: 0 }) : proto.openIssue(i.id))}
              onDoubleClick={() => proto.openIssue(i.id)}
              className={cn(
                'group flex cursor-pointer gap-2.5 border-b px-3 py-2.5',
                cur && 'md:bg-(--row-on) md:shadow-[inset_2px_0_0_var(--brand)]',
                on && 'bg-(--row-on)',
                !cur && !on && 'hover:bg-accent',
              )}
            >
              <div className="grid size-4 shrink-0 place-items-center pt-[3px]">
                <LevelGlyph level={i.level} className={cn(picking ? 'hidden' : 'md:group-hover:hidden')} />
                <Checkbox checked={on} onChange={() => toggleSelect(i.id)} className={cn(picking ? '' : 'hidden md:group-hover:grid')} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate">
                    <span className="font-semibold">{i.type}</span>
                    <span className="ml-1.5 text-foreground/75">{i.value}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">{ago(i.lastSeen)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="shrink-0 font-mono">{i.shortId}</span>
                  {i.trend !== 'ongoing' && (
                    <span className={cn('shrink-0 rounded-sm px-1 text-[11px] font-medium', i.trend === 'new' ? 'bg-(--brand)/15 text-(--brand)' : 'bg-(--lv-error)/12 text-(--lv-error)')}>
                      {i.trend === 'new' ? 'New' : 'Spiking'}
                    </span>
                  )}
                  {s.assignee[i.id] && <UserRound className="size-3.5 shrink-0 text-(--brand)" aria-label="Assigned to me" />}
                  <Bars data={i.d14} color={levelColor(i.level)} className="ml-auto h-4 w-[70px] shrink-0" />
                  <span className="w-6 shrink-0 text-right font-mono text-foreground/80">{i.count}</span>
                </div>
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <div className="px-5 py-14 text-center text-muted-foreground">
            No {status ?? ''} issues match.{' '}
            <button className="cursor-pointer text-(--brand) hover:underline" onClick={() => set({ query: 'is:unresolved', project: null })}>
              Clear filters
            </button>
          </div>
        )}
      </div>
      {picking && (
        <div className="flex h-12 shrink-0 items-center gap-0.5 border-t bg-card px-2 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-14">
          <button onClick={() => set({ selected: [] })} aria-label="Clear selection" className="grid size-8 cursor-pointer place-items-center rounded-md hover:bg-accent">
            <X className="size-4" />
          </button>
          <span className="mr-auto font-medium whitespace-nowrap">{s.selected.length} selected</span>
          <BulkButton label="Resolve" keys="E" onClick={() => act('resolve')} icon={<Check className="size-4" />} />
          <BulkButton label="Ignore" keys="I" onClick={() => act('ignore')} icon={<EyeOff className="size-4" />} />
          <BulkButton label="Assign" keys="A" onClick={() => act('assign')} icon={<UserRound className="size-4" />} />
          <BulkButton label="Merge" keys="M" onClick={() => set({ selected: [] })} icon={<GitMerge className="size-4" />} />
        </div>
      )}
    </section>
  )
}

function BulkButton({ label, keys, onClick, icon }: { label: string; keys: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button onClick={onClick} title={`${label} (${keys})`} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium hover:bg-accent">
      {icon}
      {label !== 'Merge' && label}
    </button>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[13px] whitespace-nowrap">{children}</div>
    </div>
  )
}

const TABS = ['Event', 'Events', 'Comments', 'JSON'] as const

function Detail({ issue, proto, focus }: { issue: Issue; proto: Proto; focus: boolean }) {
  const s = useStore()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Event')
  const total = issue.id === '1' ? EVENT_COUNT : 1
  const event = eventFor(issue, s.eventIndex)
  const status = statusOf(s, issue.id)
  return (
    <article className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b px-2 md:px-3">
        {focus && (
          <button onClick={proto.toInbox} aria-label="Back to list" className="grid size-8 cursor-pointer place-items-center rounded-md hover:bg-accent">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <span className="ml-1 font-mono text-[13px] font-medium">{issue.shortId}</span>
        {status !== 'unresolved' && <span className="ml-2 rounded-sm bg-(--ok)/15 px-1.5 text-[11.5px] font-medium text-(--ok) capitalize">{status}</span>}
        <div className="ml-auto flex items-center gap-0.5">
          <IconAction label={status === 'resolved' ? 'Unresolve' : 'Resolve'} keys="E" primary onClick={() => act('resolve', [issue.id])}>
            <Check className="size-4" />
          </IconAction>
          <IconAction label={status === 'ignored' ? 'Stop ignoring' : 'Ignore'} keys="I" onClick={() => act('ignore', [issue.id])}>
            <EyeOff className="size-4" />
          </IconAction>
          <IconAction label={s.assignee[issue.id] ? 'Mine' : 'Assign'} keys="A" on={!!s.assignee[issue.id]} onClick={() => act('assign', [issue.id])}>
            <UserRound className="size-4" />
          </IconAction>
          <button aria-label="More actions" className="grid size-8 cursor-pointer place-items-center rounded-md hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-border max-md:hidden" />
          <button
            onClick={() => (focus ? proto.toInbox() : proto.openIssue(issue.id))}
            title={focus ? 'Show list (Esc)' : 'Focus (Enter)'}
            className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground max-md:hidden"
          >
            {focus ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn('mx-auto w-full', focus && 'max-w-[1180px]')}>
          <div className="px-4 pt-5 md:px-6">
            <div className="flex items-start gap-2.5">
              <LevelGlyph level={issue.level} className="mt-[7px] size-3" />
              <div className="min-w-0">
                <h1 className="text-[19px] leading-snug font-semibold tracking-tight">
                  {issue.type}
                  <span className="ml-2 font-normal text-foreground/80">{issue.value}</span>
                </h1>
                <p className="mt-1 font-mono text-[12.5px] text-muted-foreground">
                  {issue.fn} <span className="opacity-60">in</span> {issue.filename} <span className="opacity-60">·</span> {issue.project}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <Fact label="Events">{issue.count}</Fact>
              <Fact label="Users">{issue.users}</Fact>
              <Fact label="First seen">
                {ago(issue.firstSeen)} ago <span className="text-muted-foreground">in {issue.firstRelease}</span>
              </Fact>
              <Fact label="Last seen">
                {ago(issue.lastSeen)} ago <span className="text-muted-foreground">in {issue.lastRelease}</span>
              </Fact>
              <div className="min-w-[160px] flex-1 md:max-w-[300px] md:ml-auto">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>14 days</span>
                  <span>peak {Math.max(...issue.d14)}/day</span>
                </div>
                <Bars data={issue.d14} color={levelColor(issue.level)} gap={1.2} className="mt-1 h-8 w-full" />
              </div>
            </div>
          </div>

          <div className="sticky top-0 z-10 mt-4 flex items-center gap-1 border-b bg-background px-3 md:px-5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  '-mb-px flex h-9 cursor-pointer items-center gap-1.5 border-b-2 px-1.5 text-[13px]',
                  tab === t ? 'border-(--brand) font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
                {t === 'Events' && <span className="font-mono text-[11.5px] text-muted-foreground">{issue.count}</span>}
              </button>
            ))}
            {tab === 'Event' && (
              <div className="ml-auto flex items-center gap-0.5 text-muted-foreground">
                <span className="mr-1 font-mono text-[12px] max-md:hidden">
                  {event.id.slice(0, 8)} · {stamp(event.at)}
                </span>
                <button title="Older event ( [ )" onClick={() => set({ eventIndex: Math.min(total - 1, s.eventIndex + 1) })} className="grid size-7 cursor-pointer place-items-center rounded-md hover:bg-accent hover:text-foreground">
                  <ChevronLeft className="size-4" />
                </button>
                <button title="Newer event ( ] )" onClick={() => set({ eventIndex: Math.max(0, s.eventIndex - 1) })} className="grid size-7 cursor-pointer place-items-center rounded-md hover:bg-accent hover:text-foreground">
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>

          <div className="px-4 py-4 pb-24 md:px-6 md:pb-8">
            {tab === 'Event' && (
              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="min-w-0 flex-1 space-y-4">
                  <StackTrace event={event} />
                  <Crumbs event={event} issue={issue} />
                  <div className="flex items-center gap-3 rounded-md border px-3 py-2 font-mono text-[12.5px]">
                    <span className="font-semibold">{event.request.method}</span>
                    <span className="min-w-0 truncate">{event.request.url}</span>
                  </div>
                </div>
                <aside className="space-y-5 lg:w-[250px] lg:shrink-0">
                  <Facets facets={FACETS} barClassName="bg-(--brand)/18 group-hover:bg-(--brand)/30" />
                  <KeyValues
                    className="border-t pt-4"
                    rows={[...event.contexts, { label: 'User', value: event.user.email }, { label: 'IP', value: event.user.ip }]}
                  />
                </aside>
              </div>
            )}
            {tab === 'Events' && (
              <div className="overflow-hidden rounded-md border font-mono text-[12.5px]">
                {(issue.id === '1' ? EVENTS : EVENTS.slice(0, 1)).map((e, i) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      set({ eventIndex: i })
                      setTab('Event')
                    }}
                    className={cn('flex w-full cursor-pointer items-center gap-4 px-3 py-1.5 text-left hover:bg-accent', i > 0 && 'border-t', i === s.eventIndex && 'bg-(--row-on)')}
                  >
                    <span className="w-36 shrink-0">{stamp(i === 0 ? issue.lastSeen : e.at)}</span>
                    <span className="w-20 shrink-0 text-muted-foreground max-md:hidden">{e.id.slice(0, 8)}</span>
                    <span className="min-w-0 flex-1 truncate">{e.user}</span>
                    <span className="w-12 shrink-0 max-md:hidden">{e.release}</span>
                    <span className="w-24 shrink-0 text-muted-foreground max-md:hidden">{e.environment}</span>
                    <span className="w-24 shrink-0 text-muted-foreground max-lg:hidden">{e.browser}</span>
                  </button>
                ))}
              </div>
            )}
            {tab === 'Comments' && (
              <div className="max-w-[640px] rounded-md border focus-within:border-(--brand)">
                <textarea rows={3} placeholder="Leave a comment" className="block w-full resize-none bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground" />
                <div className="flex justify-end px-2 pb-2">
                  <button className="h-7 cursor-pointer rounded-md bg-primary px-2.5 text-[13px] font-medium text-primary-foreground">Comment</button>
                </div>
              </div>
            )}
            {tab === 'JSON' && <JsonView event={event} />}
          </div>
        </div>
      </div>
    </article>
  )
}

function PhoneTabs() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t bg-sidebar md:hidden">
      {NAV.map(({ label, icon: Icon }) => (
        <button key={label} className={cn('flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[10.5px]', label === 'Issues' ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          <Icon className={cn('size-5', label === 'Issues' && 'text-(--brand)')} strokeWidth={1.75} />
          {label}
        </button>
      ))}
    </nav>
  )
}

export function InboxB({ proto }: { proto: Proto }) {
  const s = useStore()
  const issue = ISSUES.find((i) => i.id === s.cursor)
  useKeys({ onEnter: () => s.cursor && proto.openIssue(s.cursor), events: issue?.id === '1' ? EVENT_COUNT : 1 })
  return (
    <div className="proto vb flex h-dvh overflow-hidden">
      <Rail proto={proto} />
      <ListPane proto={proto} />
      <div className="flex min-w-0 flex-1 max-md:hidden">
        {issue ? (
          <Detail key={issue.id} issue={issue} proto={proto} focus={false} />
        ) : (
          <div className="grid flex-1 place-items-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Mark className="size-8 opacity-40" />
              Nothing left to triage
            </div>
          </div>
        )}
      </div>
      <PhoneTabs />
      <ModalPalette proto={proto} />
    </div>
  )
}

export function IssueB({ proto }: { proto: Proto }) {
  const issue = useOpenIssue(proto)
  useKeys({ onEscape: proto.toInbox, events: issue.id === '1' ? EVENT_COUNT : 1 })
  return (
    <div className="proto vb flex h-dvh overflow-hidden">
      <Rail proto={proto} />
      <Detail key={issue.id} issue={issue} proto={proto} focus />
      <ModalPalette proto={proto} />
    </div>
  )
}
