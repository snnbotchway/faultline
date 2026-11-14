// THROWAWAY PROTOTYPE · Variant A "Ledger".
// Labelled sidebar, a full-width issue table, and the issue as its own page
// (Enter opens, Esc returns) with the evidence on the left and facets in a rail.
import {
  Activity,
  ArrowLeft,
  Bell,
  Braces,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CircleDashed,
  Menu as MenuIcon,
  Moon,
  MoreHorizontal,
  Package,
  ScrollText,
  Search,
  Settings,
  Sun,
  TriangleAlert,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DAYS, EVENT_COUNT, FACETS, ISSUES, ME, NOW, DAY, ORG, PROJECTS, ago, dayLabel, eventFor, type Issue } from './data'
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
  StackTrace,
  eventLabel,
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
  toggleAll,
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

function Sidebar({ proto, className }: { proto: Proto; className?: string }) {
  const s = useStore()
  const open = ISSUES.filter((i) => statusOf(s, i.id) === 'unresolved')
  return (
    <aside className={cn('flex w-[232px] shrink-0 flex-col border-r bg-sidebar text-[13px]', className)}>
      <div className="flex h-12 items-center gap-2 px-4">
        <Mark className="text-(--brand)" />
        <span className="text-[15px] font-semibold tracking-tight">Faultline</span>
      </div>
      <div className="space-y-1 px-2">
        <button className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-accent">
          <span className="grid size-5 place-items-center rounded-[5px] bg-foreground text-[11px] font-semibold text-background">D</span>
          <span className="font-medium">{ORG}</span>
          <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={() => set({ palette: true })}
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md border bg-card px-2 text-muted-foreground hover:text-foreground"
        >
          <Search className="size-3.5" />
          Search
          <Kbd className="ml-auto">⌘K</Kbd>
        </button>
      </div>
      <nav className="mt-3 space-y-px px-2">
        {NAV.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={proto.toInbox}
            className={cn(
              'flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 hover:bg-accent',
              label === 'Issues' ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
            {label === 'Issues' && <span className="ml-auto font-mono text-[12px] text-muted-foreground">{open.length}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-5 px-4 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Projects</div>
      <div className="space-y-px px-2">
        {[{ slug: '', label: 'All projects' }, ...PROJECTS.map((p) => ({ slug: p.slug, label: p.slug }))].map((p) => {
          const on = (s.project ?? '') === p.slug
          return (
            <button
              key={p.slug}
              onClick={() => {
                set({ project: p.slug || null, selected: [] })
                proto.toInbox()
              }}
              className={cn(
                'flex h-7 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 hover:bg-accent',
                on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className={cn('ml-1 size-1.5 rounded-full', on ? 'bg-(--brand)' : 'bg-foreground/20')} />
              <span className={cn(on && 'font-medium')}>{p.label}</span>
              <span className="ml-auto font-mono text-[12px] text-muted-foreground">
                {open.filter((i) => !p.slug || i.project === p.slug).length}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-auto space-y-px border-t p-2">
        <button className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Settings className="size-4" strokeWidth={1.75} />
          Settings
        </button>
        <div className="flex h-8 items-center gap-2 px-2">
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{ME}</span>
          <button
            onClick={() => proto.setSearch({ theme: proto.dark ? 'light' : 'dark' })}
            aria-label="Switch theme"
            className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {proto.dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
    </aside>
  )
}

function Shell({ proto, children }: { proto: Proto; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  return (
    <div className="proto va flex">
      <Sidebar proto={proto} className="sticky top-0 hidden h-dvh md:flex" />
      {drawer && (
        <div className="fixed inset-0 z-50 flex bg-black/40 md:hidden" onClick={() => setDrawer(false)}>
          <Sidebar proto={proto} className="h-full" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 items-center gap-2 border-b bg-sidebar px-3 md:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Menu" className="cursor-pointer rounded-md p-1.5 hover:bg-accent">
            <MenuIcon className="size-4.5" />
          </button>
          <Mark className="text-(--brand)" />
          <span className="text-[15px] font-semibold tracking-tight">Faultline</span>
          <button onClick={() => set({ palette: true })} aria-label="Search" className="ml-auto cursor-pointer rounded-md p-1.5 hover:bg-accent">
            <Search className="size-4.5" />
          </button>
        </div>
        {children}
      </div>
      <ModalPalette proto={proto} />
    </div>
  )
}

const COLS = 'grid grid-cols-[36px_minmax(0,1fr)_64px] md:grid-cols-[44px_minmax(0,1fr)_150px_72px_72px_84px_84px_64px] items-center'

function ActionButton({
  children,
  keys,
  onClick,
  primary,
  className,
}: {
  children: ReactNode
  keys?: string
  onClick: () => void
  primary?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium whitespace-nowrap',
        primary ? 'border-primary bg-primary text-primary-foreground hover:opacity-90' : 'bg-card hover:bg-accent',
        className,
      )}
    >
      {children}
      {keys && <Kbd className="max-md:hidden">{keys}</Kbd>}
    </button>
  )
}

function Assignee({ id }: { id: string }) {
  const { assignee } = useStore()
  const who = assignee[id]
  return who ? (
    <span title={who} className="grid size-5 place-items-center rounded-full bg-(--brand) text-[10px] font-semibold text-(--brand-fg) uppercase">
      {who[0]}
    </span>
  ) : (
    <CircleDashed className="size-4 text-muted-foreground/60" aria-label="Unassigned" />
  )
}

function TrendTag({ issue }: { issue: Issue }) {
  if (issue.trend === 'ongoing') return null
  return (
    <span className={cn('font-sans text-[11px] font-medium', issue.trend === 'new' ? 'text-(--brand)' : 'text-(--lv-error)')}>
      {issue.trend === 'new' ? 'New' : 'Spiking'}
    </span>
  )
}

export function InboxA({ proto }: { proto: Proto }) {
  const s = useStore()
  const list = visible(s)
  const counts = statusCounts(s)
  const status = currentStatus(s)
  useKeys({ onEnter: () => s.cursor && proto.openIssue(s.cursor) })
  return (
    <Shell proto={proto}>
      <header className="flex h-12 items-center gap-3 border-b px-4 md:gap-5 md:px-5">
        <h1 className="text-[15px] font-semibold max-md:hidden">Issues</h1>
        <div className="flex h-full items-stretch gap-3 md:gap-4">
          {(['unresolved', 'resolved', 'ignored'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 border-b-2 pt-0.5 capitalize',
                status === k ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {k}
              <span className="font-mono text-[12px] text-muted-foreground">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Menu
            className="max-md:hidden"
            value={s.env ?? ''}
            options={ENV_OPTIONS}
            onChange={(v) => set({ env: v || null })}
            align="right"
          />
          <Menu value={s.sort} options={SORTS} onChange={(sort) => set({ sort })} align="right" />
        </div>
      </header>
      <label className="flex h-10 cursor-text items-center gap-2.5 border-b bg-card px-4 md:px-5">
        <Search className="size-4 text-muted-foreground" />
        <input
          data-search
          value={s.query}
          onChange={(e) => set({ query: e.target.value })}
          spellCheck={false}
          placeholder="Search issues"
          className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-muted-foreground"
        />
        <Kbd className="max-md:hidden">/</Kbd>
      </label>

      {s.selected.length > 0 ? (
        <div className={cn(COLS, 'sticky top-0 z-10 h-9 border-b bg-(--row-on)')}>
          <div className="grid place-items-center">
            <Checkbox checked={s.selected.length === list.length} onChange={toggleAll} />
          </div>
          <div className="col-span-2 flex items-center gap-1.5 md:col-span-7">
            <span className="mr-2 font-medium whitespace-nowrap">{s.selected.length} selected</span>
            <ActionButton keys="E" onClick={() => act('resolve')}>
              Resolve
            </ActionButton>
            <ActionButton keys="I" onClick={() => act('ignore')}>
              Ignore
            </ActionButton>
            <ActionButton keys="A" onClick={() => act('assign')}>
              Assign<span className="max-md:hidden"> to me</span>
            </ActionButton>
            <ActionButton keys="M" onClick={() => set({ selected: [] })} className="max-md:hidden">
              Merge
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className={cn(COLS, 'sticky top-0 z-10 h-9 border-b bg-background text-[11px] font-medium tracking-wide text-muted-foreground uppercase')}>
          <div className="grid place-items-center">
            <Checkbox checked={false} onChange={toggleAll} />
          </div>
          <div>Issue</div>
          <div className="max-md:text-right max-md:pr-4">14 days</div>
          <div className="text-right max-md:hidden">Events</div>
          <div className="text-right max-md:hidden">Users</div>
          <div className="text-right max-md:hidden">Last seen</div>
          <div className="text-right max-md:hidden">First seen</div>
          <div className="max-md:hidden" />
        </div>
      )}

      <div className="bg-card">
        {list.map((i) => {
          const on = s.selected.includes(i.id)
          const cur = s.cursor === i.id
          return (
            <div
              key={i.id}
              data-row={i.id}
              onClick={() => proto.openIssue(i.id)}
              onMouseMove={() => !cur && set({ cursor: i.id })}
              className={cn(
                COLS,
                'cursor-pointer border-b py-2',
                on && 'bg-(--row-on)',
                cur && !on && 'bg-accent',
                cur && 'shadow-[inset_2px_0_0_var(--brand)]',
              )}
            >
              <div className="grid place-items-center self-stretch">
                <Checkbox checked={on} onChange={() => toggleSelect(i.id)} />
              </div>
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <LevelGlyph level={i.level} />
                  <span className="truncate">
                    <span className="font-semibold">{i.type}</span>
                    <span className="ml-2 text-foreground/80">{i.value}</span>
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 pl-[18px] font-mono text-[12px] text-muted-foreground">
                  <span className="shrink-0">{i.shortId}</span>
                  <span className="truncate max-md:hidden">
                    {i.fn} · {i.filename}
                  </span>
                  <span className="shrink-0 md:hidden">
                    {ago(i.lastSeen)} · {i.count} ev
                  </span>
                  <TrendTag issue={i} />
                </div>
              </div>
              <div className="max-md:pr-4">
                <Bars data={i.d14} color={levelColor(i.level)} className="h-6 w-full md:w-[126px]" />
              </div>
              <div className="text-right font-mono max-md:hidden">{i.count}</div>
              <div className="text-right font-mono max-md:hidden">{i.users}</div>
              <div className="text-right text-muted-foreground max-md:hidden">{ago(i.lastSeen)}</div>
              <div className="text-right text-muted-foreground max-md:hidden">{ago(i.firstSeen)}</div>
              <div className="grid place-items-center max-md:hidden">
                <Assignee id={i.id} />
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <div className="px-5 py-16 text-center text-muted-foreground">
            No {status ?? ''} issues match.{' '}
            <button className="cursor-pointer text-(--brand) underline-offset-2 hover:underline" onClick={() => set({ query: 'is:unresolved', project: null })}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex h-6 items-center justify-between">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-4 py-3 md:px-5">
      <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-mono text-[18px] font-medium tracking-tight">{value}</span>
        {sub && <span className="font-mono text-[12px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}

export function IssueA({ proto }: { proto: Proto }) {
  const s = useStore()
  const issue = useOpenIssue(proto)
  const [range, setRange] = useState<'24h' | '14d'>('14d')
  const [json, setJson] = useState(false)
  const list = visible(s)
  const at = list.findIndex((i) => i.id === issue.id)
  const event = eventFor(issue, s.eventIndex)
  const total = issue.id === '1' ? EVENT_COUNT : 1
  const status = statusOf(s, issue.id)
  useKeys({ onEscape: proto.toInbox, events: total })
  return (
    <Shell proto={proto}>
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background px-3 md:px-5">
        <button onClick={proto.toInbox} className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
          <ArrowLeft className="size-4" />
          <span className="max-md:hidden">Issues</span>
        </button>
        <span className="text-muted-foreground/50 max-md:hidden">/</span>
        <span className="font-mono font-medium">{issue.shortId}</span>
        <div className="ml-2 flex items-center text-muted-foreground">
          <button onClick={() => at > 0 && proto.openIssue(list[at - 1]?.id ?? issue.id)} aria-label="Previous issue" className="cursor-pointer rounded-md p-1 hover:bg-accent hover:text-foreground">
            <ChevronUp className="size-4" />
          </button>
          <button onClick={() => at < list.length - 1 && proto.openIssue(list[at + 1]?.id ?? issue.id)} aria-label="Next issue" className="cursor-pointer rounded-md p-1 hover:bg-accent hover:text-foreground">
            <ChevronDown className="size-4" />
          </button>
          {at >= 0 && (
            <span className="ml-1 font-mono text-[12px]">
              {at + 1}/{list.length}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5 max-md:hidden">
          <ActionButton keys="E" primary onClick={() => act('resolve', [issue.id])}>
            {status === 'resolved' ? 'Unresolve' : 'Resolve'}
          </ActionButton>
          <ActionButton keys="I" onClick={() => act('ignore', [issue.id])}>
            {status === 'ignored' ? 'Stop ignoring' : 'Ignore'}
          </ActionButton>
          <ActionButton keys="A" onClick={() => act('assign', [issue.id])}>
            <Assignee id={issue.id} />
            {s.assignee[issue.id] ? 'Assigned to me' : 'Assign'}
          </ActionButton>
          <button aria-label="More actions" className="grid size-7 cursor-pointer place-items-center rounded-md border bg-card hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 pb-4 md:px-5">
        <div className="flex items-center gap-2.5">
          <LevelGlyph level={issue.level} className="size-3" />
          <h1 className="text-[20px] leading-tight font-semibold tracking-tight">{issue.type}</h1>
          {status !== 'unresolved' && (
            <span className="rounded-full border px-2 py-px text-[11px] font-medium text-(--ok) capitalize">{status}</span>
          )}
          <TrendTag issue={issue} />
        </div>
        <p className="mt-1 text-[15px] text-foreground/85">{issue.value}</p>
        <p className="mt-1.5 font-mono text-[12.5px] text-muted-foreground">
          {issue.fn} <span className="opacity-60">in</span> {issue.filename} <span className="opacity-60">·</span> {issue.project}
        </p>
      </div>

      <div className="grid grid-cols-2 border-y bg-card md:grid-cols-[repeat(4,auto)_1fr] md:divide-x">
        <Stat label="Events" value={String(issue.count)} />
        <Stat label="Users" value={String(issue.users)} />
        <Stat label="First seen" value={ago(issue.firstSeen)} sub={`ago · ${issue.firstRelease}`} />
        <Stat label="Last seen" value={ago(issue.lastSeen)} sub={`ago · ${issue.lastRelease}`} />
        <div className="col-span-2 flex items-end gap-4 border-t px-4 py-3 md:col-span-1 md:border-t-0 md:px-5">
          <div className="min-w-0 flex-1">
            <Bars data={range === '14d' ? issue.d14 : issue.h24} color={levelColor(issue.level)} gap={1.2} className="h-10 w-full" />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>{range === '14d' ? dayLabel(NOW - (DAYS - 1) * DAY) : '24h ago'}</span>
              <span>{range === '14d' ? 'Today' : 'Now'}</span>
            </div>
          </div>
          <div className="mb-5 flex rounded-md border p-0.5 text-[12px]">
            {(['24h', '14d'] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn('cursor-pointer rounded-[5px] px-1.5 py-0.5 font-mono', range === r ? 'bg-accent font-medium' : 'text-muted-foreground')}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        <div className="min-w-0 flex-1 space-y-6 px-4 py-5 pb-24 md:px-5 md:pb-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-[13px] font-semibold">Event</span>
            <span className="font-mono text-[12.5px] text-muted-foreground">{eventLabel(event)}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <ActionButton keys="[" onClick={() => set({ eventIndex: Math.min(total - 1, s.eventIndex + 1) })}>
                Older
              </ActionButton>
              <ActionButton keys="]" onClick={() => set({ eventIndex: Math.max(0, s.eventIndex - 1) })}>
                Newer
              </ActionButton>
              <ActionButton onClick={() => setJson(!json)} className={cn(json && 'bg-accent')}>
                <Braces className="size-3.5" />
                JSON
              </ActionButton>
            </div>
          </div>
          {json ? (
            <JsonView event={event} />
          ) : (
            <>
              <Section title="Stack trace">
                <StackTrace event={event} className="bg-card" />
              </Section>
              <Section title="Breadcrumbs">
                <Crumbs event={event} issue={issue} className="bg-card" />
              </Section>
              <Section title="Request">
                <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 font-mono text-[12.5px]">
                  <span className="font-semibold">{event.request.method}</span>
                  <span className="min-w-0 truncate">{event.request.url}</span>
                </div>
              </Section>
              <Section title="Comments">
                <div className="rounded-md border bg-card focus-within:border-(--brand)">
                  <textarea rows={2} placeholder="Leave a comment" className="block w-full resize-none bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground" />
                  <div className="flex justify-end px-2 pb-2">
                    <ActionButton onClick={() => {}}>Comment</ActionButton>
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>
        <aside className="space-y-6 border-t px-4 py-5 pb-24 md:w-[320px] md:shrink-0 md:border-t-0 md:border-l md:px-5 md:pb-10">
          <Section title="Tags">
            <Facets facets={FACETS} />
          </Section>
          <Section title="Device">
            <KeyValues rows={event.contexts} />
          </Section>
          <Section title="User">
            <KeyValues
              rows={[
                { label: 'Email', value: event.user.email },
                { label: 'ID', value: event.user.id },
                { label: 'IP', value: event.user.ip },
              ]}
            />
          </Section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-background p-3 md:hidden">
        <ActionButton primary onClick={() => act('resolve', [issue.id])} className="h-10 flex-1 justify-center">
          {status === 'resolved' ? 'Unresolve' : 'Resolve'}
        </ActionButton>
        <ActionButton onClick={() => act('ignore', [issue.id])} className="h-10 flex-1 justify-center">
          {status === 'ignored' ? 'Stop ignoring' : 'Ignore'}
        </ActionButton>
        <ActionButton onClick={() => act('assign', [issue.id])} className="h-10 justify-center px-3">
          <Assignee id={issue.id} />
        </ActionButton>
      </div>
    </Shell>
  )
}
