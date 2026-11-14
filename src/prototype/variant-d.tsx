// THROWAWAY PROTOTYPE · Variant D "Fieldbook": the picker's mix, built on C.
// From C: the top-bar shell, the typewriter face and warm paper, the grouped inbox
// on a shared time axis with release markers, the in-place row unfold and the
// issue layout. From B: the phone tab bar and the "peak N/day" label. From A: the
// phone action bar with a filled Resolve and the 24h/14d toggle.
// Type: IBM Plex Mono for chrome and data, IBM Plex Sans (`.prose`) for sentences.
// The second bar mirrors the stock GlitchTip paths the real app will keep:
// /:org/issues, /:org/issues/:id, /:org/settings/projects/:slug.
import { Activity, ArrowLeft, Bell, ChevronDown, ChevronUp, Ellipsis, Package, Search, TriangleAlert, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  DAY,
  DAYS,
  EVENT_COUNT,
  FACETS,
  MEMBERS,
  NOW,
  ORG,
  PROJECT_DETAILS,
  RELEASES,
  ago,
  dayLabel,
  eventFor,
  stamp,
  type EventDetail,
  type Facet,
  type Issue,
  type Trend,
} from './data'
import {
  Checkbox,
  ENV_OPTIONS,
  JsonView,
  Kbd,
  LevelGlyph,
  Mark,
  Menu,
  ModalPalette,
  PROJECT_OPTIONS,
  StackTrace,
  crumbLabel,
  levelColor,
  useOpenIssue,
} from './shared'
import {
  SORTS,
  act,
  currentStatus,
  get,
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

const NAV = ['issues', 'releases', 'uptime', 'logs', 'alerts', 'settings']
const lower = <T extends { label: string }>(options: T[]) => options.map((o) => ({ ...o, label: o.label.toLowerCase() }))

function wobble(seed: number, j: number) {
  const x = Math.sin(seed * 12.9898 + j * 78.233) * 43758.5453
  return 0.6 + 0.4 * (x - Math.floor(x))
}

/**
 * A seismograph channel. Swing is linear in events per bucket against `max`, so
 * channels that share a `max` can be compared. Quiet stretches are left to the
 * neutral baseline; only activity is drawn in colour.
 */
function Trace({ data, max, color, seed, className, p = 6 }: { data: number[]; max: number; color: string; seed: number; className?: string; p?: number }) {
  const amp = data.map((v) => (v > 0 ? Math.max(0.07, v / max) : 0))
  const n = data.length * p
  let d = ''
  let pen = false
  for (let j = 0; j <= n; j++) {
    const t = j / p - 0.5
    const d0 = Math.max(0, Math.min(data.length - 1, Math.floor(t)))
    const d1 = Math.min(data.length - 1, d0 + 1)
    const f = Math.max(0, Math.min(1, t - d0))
    const a = (amp[d0] ?? 0) * (1 - f) + (amp[d1] ?? 0) * f
    if (a < 0.004) {
      if (pen) d += `L${j} 50`
      pen = false
      continue
    }
    if (!pen) d += `M${Math.max(0, j - 1)} 50`
    pen = true
    d += `L${j} ${(50 - (j % 2 ? 1 : -1) * a * wobble(seed, j) * 47).toFixed(1)}`
  }
  return (
    <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className={cn('block h-9 w-full', className)} aria-hidden>
      <path d={`M0 50H${n}`} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** A lane on the time axis: bucket grid and release lines behind the content. */
function Lane({ children, labels, className, buckets = DAYS, span = DAYS * DAY }: { children?: ReactNode; labels?: boolean; className?: string; buckets?: number; span?: number }) {
  return (
    <div
      className={cn('relative self-stretch overflow-hidden border-x border-(--grid)', className)}
      style={{ backgroundImage: 'linear-gradient(to right, var(--grid) 1px, transparent 1px)', backgroundSize: `${100 / buckets}% 100%` }}
    >
      {RELEASES.map((r) => {
        const pct = (1 - (NOW - r.at) / span) * 100
        if (pct < 0 || pct > 100) return null
        return (
          <div key={r.version} className="absolute inset-y-0 border-l border-dashed border-foreground/40" style={{ left: `${pct}%` }}>
            {labels && (
              <span className={cn('absolute top-0 bg-background px-1 text-[12px] leading-4 text-muted-foreground', pct > 85 ? 'right-px' : 'left-px')}>{r.version}</span>
            )}
          </div>
        )
      })}
      <div className="relative flex h-full items-center">{children}</div>
    </div>
  )
}

function Axis({ range = '14d', className }: { range?: '14d' | '24h'; className?: string }) {
  if (range === '24h') {
    return (
      <div className={cn('flex h-6 justify-between px-1 text-[12px] leading-6 text-muted-foreground', className)}>
        {['−24h', '−18h', '−12h', '−6h', 'now'].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    )
  }
  return (
    <div className={cn('flex h-6 text-[12px] text-muted-foreground', className)}>
      {Array.from({ length: DAYS }, (_, d) => {
        const t = NOW - (DAYS - 1 - d) * DAY
        return (
          <span key={d} className="flex-1 pl-1 leading-6 whitespace-nowrap">
            {d % 2 === 0 ? (d === 0 ? dayLabel(t) : new Date(t).getUTCDate()) : ''}
          </span>
        )
      })}
    </div>
  )
}

function Btn({
  children,
  keys,
  onClick,
  primary,
  danger,
  className,
}: {
  children: ReactNode
  keys?: string
  onClick?: () => void
  primary?: boolean
  danger?: boolean
  className?: string
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        'flex h-7 shrink-0 cursor-pointer items-center justify-center gap-2 border px-2.5 text-[13px] font-medium whitespace-nowrap lowercase',
        primary ? 'border-primary bg-primary text-primary-foreground hover:opacity-90' : 'bg-card hover:bg-accent',
        danger && 'border-(--lv-error) text-(--lv-error)',
        className,
      )}
    >
      {children}
      {keys && <Kbd className="h-[18px] rounded-none text-[12px] uppercase max-lg:hidden">{keys}</Kbd>}
    </button>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[12px] tracking-[0.12em] text-muted-foreground uppercase">{children}</div>
}

function Who({ id }: { id: string }) {
  const who = useStore().assignee[id]
  return who ? (
    <span title={who} className="grid size-[18px] place-items-center bg-(--brand) text-[12px] font-semibold text-(--brand-fg) uppercase">
      {who[0]}
    </span>
  ) : (
    <span className="block size-[14px] border border-dashed border-foreground/30" role="img" aria-label="Unassigned" />
  )
}

const TABS = [
  { label: 'issues', icon: TriangleAlert },
  { label: 'releases', icon: Package },
  { label: 'uptime', icon: Activity },
  { label: 'alerts', icon: Bell },
]

function TabBar({ proto, section }: { proto: Proto; section: string }) {
  const [more, setMore] = useState(false)
  const other = !TABS.some((t) => t.label === section)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t bg-card lg:hidden">
      {TABS.map(({ label, icon: Icon }) => (
        <button
          key={label}
          onClick={proto.toInbox}
          className={cn('flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[12px]', label === section ? 'font-semibold shadow-[inset_0_2px_0_var(--brand)]' : 'text-muted-foreground')}
        >
          <Icon className="size-5" strokeWidth={1.6} />
          {label}
        </button>
      ))}
      <button
        onClick={() => setMore(!more)}
        className={cn('flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[12px]', other ? 'font-semibold shadow-[inset_0_2px_0_var(--brand)]' : 'text-muted-foreground')}
      >
        <Ellipsis className="size-5" strokeWidth={1.6} />
        more
      </button>
      {more && (
        <div className="absolute right-2 bottom-[60px] w-44 border bg-card py-1 text-[14px] shadow-lg">
          <button className="block w-full cursor-pointer px-3 py-2.5 text-left hover:bg-accent" onClick={proto.toInbox}>
            logs
          </button>
          <button className="block w-full cursor-pointer px-3 py-2.5 text-left hover:bg-accent" onClick={proto.toSettings}>
            settings
          </button>
          <button className="block w-full cursor-pointer border-t px-3 py-2.5 text-left hover:bg-accent" onClick={() => proto.setSearch({ theme: proto.dark ? 'light' : 'dark' })}>
            {proto.dark ? 'light theme' : 'dark theme'}
          </button>
        </div>
      )}
    </nav>
  )
}

function Shell({
  proto,
  section,
  line,
  children,
  bottom,
}: {
  proto: Proto
  section: 'issues' | 'settings'
  line: ReactNode
  children: ReactNode
  /** Phone only: replaces the tab bar (the issue page puts its actions here). */
  bottom?: ReactNode
}) {
  const s = useStore()
  useEffect(() => {
    set({ grouped: true })
    return () => set({ grouped: false })
  }, [])
  return (
    <div className="proto vd flex flex-col max-lg:pb-14">
      <header className="flex h-10 shrink-0 items-center gap-4 border-b px-3 md:px-4">
        <button onClick={proto.toInbox} className="flex cursor-pointer items-center gap-2">
          <Mark className="size-[18px] text-(--brand)" />
          <span className="text-[12px] font-semibold tracking-[0.18em]">FAULTLINE</span>
        </button>
        <div className="flex min-w-0 items-center text-muted-foreground">
          <span className="px-1 max-md:hidden">{ORG.toLowerCase().replace(' ', '-')}</span>
          {section === 'issues' && (
            <>
              <span className="max-md:hidden">/</span>
              <Menu className="h-6 rounded-none px-1.5 text-foreground" value={s.project ?? ''} options={lower(PROJECT_OPTIONS)} onChange={(v) => set({ project: v || null, selected: [] })} />
              <span className="max-md:hidden">/</span>
              <Menu className="h-6 rounded-none px-1.5 text-foreground max-md:hidden" value={s.env ?? ''} options={lower(ENV_OPTIONS)} onChange={(v) => set({ env: v || null })} />
            </>
          )}
        </div>
        <nav className="ml-auto flex items-center gap-4 max-lg:hidden">
          {NAV.map((n) => (
            <button
              key={n}
              onClick={n === 'settings' ? proto.toSettings : proto.toInbox}
              className={cn('cursor-pointer underline-offset-[13px] hover:text-foreground', n === section ? 'underline decoration-(--brand) decoration-2' : 'text-muted-foreground')}
            >
              {n}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 max-lg:ml-auto lg:border-l lg:pl-4">
          <button onClick={() => proto.setSearch({ theme: proto.dark ? 'light' : 'dark' })} aria-label="Switch theme" className="cursor-pointer px-1 text-[15px] leading-none text-muted-foreground hover:text-foreground max-lg:hidden">
            {proto.dark ? '◑' : '◐'}
          </button>
          <button onClick={() => set({ palette: true })} aria-label="Commands" className="flex h-7 cursor-pointer items-center border bg-card px-1.5 text-[12px] hover:bg-accent">
            <span className="max-lg:hidden">⌘K</span>
            <Search className="size-4 lg:hidden" />
          </button>
        </div>
      </header>
      <div className="sticky top-0 z-30 flex h-11 shrink-0 items-center gap-3 border-b bg-card px-3 md:px-4">{line}</div>
      {children}
      {bottom ?? <TabBar proto={proto} section={section} />}
      <ModalPalette proto={proto} lower className="max-w-[640px] rounded-none" listClassName="max-h-[68vh]" />
    </div>
  )
}

const ROW = 'grid grid-cols-[34px_minmax(0,1fr)_76px] lg:grid-cols-[34px_minmax(0,5fr)_minmax(0,6fr)_56px_56px_52px_48px] items-center'
const GROUPS: Trend[] = ['new', 'spiking', 'ongoing']

function TextFacets({ facets }: { facets: Facet[] }) {
  return (
    <div className="space-y-3">
      {facets.map((f) => (
        <div key={f.key}>
          <div className="flex justify-between text-muted-foreground">
            <span>{f.key}</span>
            {f.top.length === 0 && <span>{f.unique} values</span>}
          </div>
          {f.top.map((v) => {
            const pct = Math.round((v.count / f.total) * 100)
            return (
              <button key={v.value} onClick={() => set({ query: `${get().query} ${f.key}:${v.value}` })} className="flex w-full cursor-pointer items-baseline gap-2 text-left hover:bg-accent">
                <span className="min-w-0 flex-1 truncate">{v.value}</span>
                <span className="h-[7px] w-20 shrink-0 self-center bg-(--grid)">
                  <span className="block h-full bg-foreground/60" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-9 text-right text-muted-foreground">{pct}%</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** Breadcrumbs as a countdown to the crash, ending on the exception itself. */
function Story({ event, issue, code }: { event: EventDetail; issue: Issue; code?: boolean }) {
  const top = code ? event.frames.find((f) => f.inApp && f.context.length > 0) : undefined
  return (
    <div>
      <div className="border-l border-foreground/35">
        {event.crumbs.map((c, i) => (
          <div key={i} className="relative flex gap-3 py-1 pl-4">
            <span className="absolute top-[11px] -left-[3px] size-[5px] rounded-full bg-foreground/60" />
            <span className="w-14 shrink-0 text-right text-muted-foreground">−{((event.at - c.at) / 1000).toFixed(1)}s</span>
            <span className="w-[5.5rem] shrink-0 text-muted-foreground">{c.category}</span>
            <span className="min-w-0 break-words">{crumbLabel(c)}</span>
          </div>
        ))}
        <div className="relative flex gap-3 bg-(--hit) py-1 pl-4">
          <span className="absolute top-[9px] -left-[5px] size-[9px] bg-(--lv-error)" />
          <span className="w-14 shrink-0 text-right text-(--lv-error)">0.0s</span>
          <span className="min-w-0 break-words">
            <span className="font-semibold">{issue.type}</span> {issue.value}
          </span>
        </div>
      </div>
      {top && (
        <pre className="mt-3 overflow-x-auto bg-(--code-bg) py-1.5 leading-[1.65]">
          {top.context.map(([n, text]) => (
            <div key={n} className={cn('flex min-w-max pr-3', n === top.line && 'bg-(--hit) shadow-[inset_2px_0_0_var(--lv-error)]')}>
              <span className={cn('w-11 shrink-0 pr-3 text-right select-none', n === top.line ? 'text-(--lv-error)' : 'text-muted-foreground')}>{n}</span>
              <span>{text || ' '}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  )
}

function Dossier({ issue, proto }: { issue: Issue; proto: Proto }) {
  const event = eventFor(issue, 0)
  const mine = !!useStore().assignee[issue.id]
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
    ref.current?.previousElementSibling?.scrollIntoView({ block: 'nearest' })
  }, [issue.id])
  return (
    <div ref={ref} className="scroll-mb-4 border-b bg-card shadow-[inset_2px_0_0_var(--brand)] max-lg:hidden">
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] gap-x-8 py-4 pr-4 pl-[34px]">
        <div className="min-w-0">
          <Label>what happened</Label>
          <Story event={event} issue={issue} code />
        </div>
        <div className="min-w-0">
          <Label>where</Label>
          {event.frames.map((f, i) => (
            <div key={i} className={cn('flex gap-2 py-0.5', !f.inApp && 'text-muted-foreground')}>
              <span className="w-4 shrink-0 text-muted-foreground">{i}</span>
              <span className="min-w-0 truncate">
                <span className={cn(f.inApp && 'font-semibold')}>{f.fn}</span> {f.filename}:{f.line}
              </span>
            </div>
          ))}
          <div className="mt-3 truncate text-muted-foreground">
            {event.request.method} {event.request.url}
          </div>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4">
            <span className="text-muted-foreground">first</span>
            <span>
              {ago(issue.firstSeen)} ago in {issue.firstRelease}
            </span>
            <span className="text-muted-foreground">last</span>
            <span>
              {ago(issue.lastSeen)} ago in {issue.lastRelease}
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <Label>who</Label>
          <TextFacets facets={FACETS.slice(0, 4)} />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-dashed py-2 pr-4 pl-[34px]">
        <Btn primary keys="E" onClick={() => act('resolve', [issue.id])}>
          Resolve
        </Btn>
        <Btn keys="I" onClick={() => act('ignore', [issue.id])}>
          Ignore
        </Btn>
        <Btn keys="A" onClick={() => act('assign', [issue.id])}>
          {mine ? 'Unassign' : 'Assign to me'}
        </Btn>
        <Btn keys="↵" onClick={() => proto.openIssue(issue.id)} className="ml-auto">
          Open issue
        </Btn>
      </div>
    </div>
  )
}

function StatusLine() {
  const st = useStore()
  const counts = statusCounts(st)
  const status = currentStatus(st)
  return (
    <div className="flex h-9 shrink-0 items-center gap-2.5 border-b px-3 max-md:text-[12px] md:gap-4 md:px-4">
      {(['unresolved', 'resolved', 'ignored'] as const).map((k) => (
        <button key={k} onClick={() => setStatusFilter(k)} className={cn('cursor-pointer whitespace-nowrap', status === k ? 'font-semibold' : 'text-muted-foreground hover:text-foreground')}>
          {k} {counts[k]}
        </button>
      ))}
      <div className="ml-auto flex items-center text-muted-foreground">
        <span className="max-md:hidden">sort</span>
        <Menu className="h-6 rounded-none px-1.5 text-foreground max-md:px-0 max-md:text-[12px]" value={st.sort} options={lower(SORTS)} onChange={(sort) => set({ sort })} align="right" />
      </div>
    </div>
  )
}

export function InboxD({ proto }: { proto: Proto }) {
  const st = useStore()
  const [peek, setPeek] = useState(false)
  const list = visible(st)
  const totals = Array.from({ length: DAYS }, (_, d) => list.reduce((sum, i) => sum + (i.d14[d] ?? 0), 0))
  const peak = Math.max(1, ...totals)
  const rowMax = Math.max(1, ...list.flatMap((i) => i.d14))
  const events = totals.reduce((a, b) => a + b, 0)
  const wide = () => window.matchMedia('(min-width: 1024px)').matches
  useKeys({
    onEnter: () => (peek || !wide() ? st.cursor && proto.openIssue(st.cursor) : setPeek(true)),
    onEscape: () => setPeek(false),
  })
  const line =
    st.selected.length > 0 ? (
      <>
        <span className="font-semibold whitespace-nowrap">{st.selected.length} selected</span>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <Btn primary keys="E" onClick={() => act('resolve')}>
            Resolve
          </Btn>
          <Btn keys="I" onClick={() => act('ignore')}>
            Ignore
          </Btn>
          <Btn keys="A" onClick={() => act('assign')}>
            Assign<span className="max-md:hidden"> to me</span>
          </Btn>
          <Btn keys="M" onClick={() => set({ selected: [] })} className="max-md:hidden">
            Merge
          </Btn>
        </div>
        <button onClick={() => set({ selected: [] })} aria-label="Clear selection" className="ml-auto grid size-7 shrink-0 cursor-pointer place-items-center hover:bg-accent">
          <X className="size-4" />
        </button>
      </>
    ) : (
      <>
        <span className="font-semibold text-(--brand)">›</span>
        <input
          data-search
          value={st.query}
          onChange={(e) => set({ query: e.target.value })}
          spellCheck={false}
          placeholder="search issues"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
        />
        <Kbd className="h-5 rounded-none text-[12px] max-lg:hidden">/</Kbd>
      </>
    )
  return (
    <Shell proto={proto} section="issues" line={line}>
      <StatusLine />
      <div className={cn(ROW, 'border-b max-lg:grid-cols-1')}>
        <div className="max-lg:hidden" />
        <div className="flex items-end gap-8 py-3 max-lg:px-3">
          <div>
            <div className="text-[26px] leading-none font-semibold tracking-tight">{events}</div>
            <div className="mt-1 whitespace-nowrap text-muted-foreground">events / 14 days</div>
          </div>
          {GROUPS.slice(0, 2).map((g) => (
            <div key={g}>
              <div className={cn('text-[26px] leading-none font-semibold tracking-tight', g === 'spiking' && 'text-(--lv-error)')}>{list.filter((i) => i.trend === g).length}</div>
              <div className="mt-1 text-muted-foreground">{g}</div>
            </div>
          ))}
        </div>
        <div className="-mt-2 px-3 pb-1 text-right text-muted-foreground lg:hidden">peak {peak}/day</div>
        <Lane labels className="h-[84px] max-lg:mx-3 max-lg:h-[64px]">
          <Trace data={totals} max={peak} color="var(--foreground)" seed={99} className="h-[66px] pt-4 max-lg:h-[52px]" />
        </Lane>
        <div className="col-span-4 self-end pb-2 pl-3 text-muted-foreground max-lg:hidden">peak {peak}/day</div>
      </div>
      <div className={cn(ROW, 'h-6 border-b text-[12px] tracking-[0.12em] text-muted-foreground uppercase max-lg:block')}>
        <div className="max-lg:hidden" />
        <div className="max-lg:hidden">issue</div>
        <Axis className="border-x border-(--grid) tracking-normal normal-case max-lg:mx-3" />
        <div className="text-right max-lg:hidden">events</div>
        <div className="text-right max-lg:hidden">users</div>
        <div className="text-right max-lg:hidden">seen</div>
        <div className="max-lg:hidden" />
      </div>

      {GROUPS.map((g) => {
        const rows = list.filter((i) => i.trend === g)
        if (rows.length === 0) return null
        return (
          <Fragment key={g}>
            <div className={cn(ROW, 'h-7 border-b bg-muted text-[12px] tracking-[0.12em] uppercase')}>
              <div />
              <div className="col-span-2 lg:col-span-6">
                <span className={cn('font-semibold', g === 'spiking' && 'text-(--lv-error)', g === 'new' && 'text-(--brand)')}>{g}</span>
                <span className="ml-2 text-muted-foreground">{rows.length}</span>
              </div>
            </div>
            {rows.map((i) => {
              const on = st.selected.includes(i.id)
              const cur = st.cursor === i.id
              const open = peek && cur
              return (
                <Fragment key={i.id}>
                  <div
                    data-row={i.id}
                    onClick={() => {
                      if (!wide()) return proto.openIssue(i.id)
                      setPeek(!open)
                      set({ cursor: i.id })
                    }}
                    className={cn(
                      ROW,
                      'h-10 scroll-mt-12 cursor-pointer border-b max-lg:h-[54px]',
                      on ? 'bg-(--row-on)' : cur ? 'lg:bg-accent' : 'hover:bg-accent/60',
                      cur && 'lg:shadow-[inset_2px_0_0_var(--brand)]',
                    )}
                  >
                    <div className="grid place-items-center self-stretch">
                      <Checkbox checked={on} onChange={() => toggleSelect(i.id)} className="size-3.5 rounded-none max-lg:size-4" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <LevelGlyph level={i.level} className="size-2" />
                        <span className="truncate">
                          <span className="font-semibold">{i.type}</span>
                          <span className="ml-2 text-foreground/80">{i.value}</span>
                        </span>
                        <span className="ml-auto shrink-0 pl-2 text-[12px] text-muted-foreground max-lg:hidden">{i.shortId}</span>
                      </div>
                      <div className="pl-4 text-[12px] text-muted-foreground lg:hidden">
                        {i.shortId} · {ago(i.lastSeen)} · {i.count} ev
                      </div>
                    </div>
                    <Lane className="max-lg:hidden">
                      <Trace data={i.d14} max={rowMax} color={levelColor(i.level)} seed={Number(i.id)} />
                    </Lane>
                    <Trace data={i.d14} max={rowMax} color={levelColor(i.level)} seed={Number(i.id)} p={2} className="w-[64px] lg:hidden" />
                    <div className="text-right max-lg:hidden">{i.count}</div>
                    <div className="text-right max-lg:hidden">{i.users}</div>
                    <div className="text-right text-muted-foreground max-lg:hidden">{ago(i.lastSeen)}</div>
                    <div className="grid place-items-center max-lg:hidden">
                      <Who id={i.id} />
                    </div>
                  </div>
                  {open && <Dossier issue={i} proto={proto} />}
                </Fragment>
              )
            })}
          </Fragment>
        )
      })}
      {list.length === 0 && (
        <div className="px-4 py-16 text-center text-muted-foreground">
          nothing matches.{' '}
          <button onClick={() => set({ query: 'is:unresolved', project: null })} className="cursor-pointer text-(--brand) underline underline-offset-4">
            clear filters
          </button>
        </div>
      )}
    </Shell>
  )
}

export function IssueD({ proto }: { proto: Proto }) {
  const st = useStore()
  const issue = useOpenIssue(proto)
  const [json, setJson] = useState(false)
  const [range, setRange] = useState<'24h' | '14d'>('14d')
  const list = visible(st)
  const at = list.findIndex((i) => i.id === issue.id)
  const total = issue.id === '1' ? EVENT_COUNT : 1
  const event = eventFor(issue, st.eventIndex)
  const status = statusOf(st, issue.id)
  const mine = !!st.assignee[issue.id]
  const series = range === '14d' ? issue.d14 : issue.h24
  useKeys({ onEscape: proto.toInbox, events: total })
  const resolve = status === 'resolved' ? 'Unresolve' : 'Resolve'
  const ignore = status === 'ignored' ? 'Stop ignoring' : 'Ignore'
  const line = (
    <>
      <button onClick={proto.toInbox} className="flex cursor-pointer items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        issues
      </button>
      <span className="text-muted-foreground">/</span>
      <span className="font-semibold whitespace-nowrap">{issue.shortId}</span>
      <div className="flex items-center text-muted-foreground">
        <button onClick={() => at > 0 && proto.openIssue(list[at - 1]?.id ?? issue.id)} aria-label="Previous issue" className="cursor-pointer p-1 hover:bg-accent hover:text-foreground">
          <ChevronUp className="size-4" />
        </button>
        <button onClick={() => at < list.length - 1 && proto.openIssue(list[at + 1]?.id ?? issue.id)} aria-label="Next issue" className="cursor-pointer p-1 hover:bg-accent hover:text-foreground">
          <ChevronDown className="size-4" />
        </button>
        {at >= 0 && (
          <span className="ml-1 whitespace-nowrap">
            {at + 1} of {list.length}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2 max-lg:hidden">
        <Btn primary keys="E" onClick={() => act('resolve', [issue.id])}>
          {resolve}
        </Btn>
        <Btn keys="I" onClick={() => act('ignore', [issue.id])}>
          {ignore}
        </Btn>
        <Btn keys="A" onClick={() => act('assign', [issue.id])}>
          <Who id={issue.id} />
          {mine ? 'Assigned to me' : 'Assign to me'}
        </Btn>
      </div>
    </>
  )
  const bottom = (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-card p-2.5 lg:hidden">
      <Btn primary onClick={() => act('resolve', [issue.id])} className="h-11 flex-1 text-[14px]">
        {resolve}
      </Btn>
      <Btn onClick={() => act('ignore', [issue.id])} className="h-11 flex-1 text-[14px]">
        {ignore}
      </Btn>
      <Btn onClick={() => act('assign', [issue.id])} className="h-11 px-3 text-[14px]">
        <Who id={issue.id} />
        {mine ? 'Mine' : 'Assign'}
      </Btn>
    </div>
  )
  return (
    <Shell proto={proto} section="issues" line={line} bottom={bottom}>
      <div className="grid border-b lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="px-3 py-5 md:px-4">
          <div className="flex items-center gap-2.5">
            <LevelGlyph level={issue.level} className="size-3" />
            <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{issue.type}</h1>
            {issue.trend !== 'ongoing' && <span className={cn('text-[12px] tracking-[0.12em] uppercase', issue.trend === 'new' ? 'text-(--brand)' : 'text-(--lv-error)')}>{issue.trend}</span>}
            {status !== 'unresolved' && <span className="text-[12px] tracking-[0.12em] text-(--ok) uppercase">{status}</span>}
          </div>
          <p className="mt-1.5 text-[14px]">{issue.value}</p>
          <p className="mt-1.5 text-muted-foreground">
            {issue.fn} in {issue.filename} · {issue.project}
          </p>
          <div className="mt-5 grid grid-cols-4 gap-x-6 max-md:grid-cols-2 max-md:gap-y-3">
            {[
              ['events', String(issue.count), ''],
              ['users', String(issue.users), ''],
              ['first seen', `${ago(issue.firstSeen)} ago`, issue.firstRelease],
              ['last seen', `${ago(issue.lastSeen)} ago`, issue.lastRelease],
            ].map(([label, value, release]) => (
              <div key={label}>
                <div className="text-[12px] tracking-[0.12em] text-muted-foreground uppercase">{label}</div>
                <div className="mt-0.5 text-[15px] font-semibold whitespace-nowrap">{value}</div>
                {release && <div className="text-muted-foreground">in {release}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 px-3 pt-3 pb-2 md:px-4 lg:border-l">
          <div className="mb-1.5 flex items-center gap-3 text-muted-foreground">
            <span>events / {range === '14d' ? 'day' : 'hour'}</span>
            <span className="ml-auto">
              peak {Math.max(...series)}/{range === '14d' ? 'day' : 'hour'}
            </span>
            <div className="flex border text-foreground">
              {(['24h', '14d'] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={cn('cursor-pointer px-2 py-0.5', range === r ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Lane labels className="h-[112px] border-y max-lg:h-[92px]" buckets={series.length} span={range === '14d' ? DAYS * DAY : DAY}>
            <Trace data={series} max={Math.max(1, ...series)} color={levelColor(issue.level)} seed={Number(issue.id)} p={range === '14d' ? 6 : 4} className="h-[92px] pt-4 max-lg:h-[76px]" />
          </Lane>
          <Axis range={range} />
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6 px-3 py-5 md:px-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-muted-foreground">
              event <span className="text-foreground">{event.id.slice(0, 8)}</span> · {stamp(event.at)}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Btn keys="[" onClick={() => set({ eventIndex: Math.min(total - 1, st.eventIndex + 1) })}>
                Older
              </Btn>
              <Btn keys="]" onClick={() => set({ eventIndex: Math.max(0, st.eventIndex - 1) })}>
                Newer
              </Btn>
              <Btn onClick={() => setJson(!json)} className={cn(json && 'bg-accent')}>
                JSON
              </Btn>
            </div>
          </div>
          {json ? (
            <JsonView event={event} />
          ) : (
            <>
              <section>
                <Label>what happened</Label>
                <Story event={event} issue={issue} />
              </section>
              <section>
                <Label>stack trace</Label>
                <StackTrace event={event} className="bg-card" />
              </section>
              <section>
                <Label>request</Label>
                <div className="truncate border bg-card px-3 py-2">
                  <span className="font-semibold">{event.request.method}</span> {event.request.url}
                </div>
              </section>
              <section>
                <Label>comments</Label>
                <textarea rows={2} placeholder="Leave a comment" className="prose block w-full resize-none border bg-card px-3 py-2 outline-none placeholder:text-muted-foreground focus:border-(--brand)" />
                <div className="mt-2 flex justify-end">
                  <Btn>Comment</Btn>
                </div>
              </section>
            </>
          )}
        </div>
        <aside className="space-y-6 px-3 py-5 max-lg:border-t max-lg:pb-24 md:px-4 lg:border-l">
          <section>
            <Label>tags</Label>
            <TextFacets facets={FACETS} />
          </section>
          <section>
            <Label>device</Label>
            {event.contexts.map((c) => (
              <div key={c.label} className="flex justify-between">
                <span className="text-muted-foreground">{c.label.toLowerCase()}</span>
                <span>{c.value}</span>
              </div>
            ))}
          </section>
          <section>
            <Label>user</Label>
            {[
              ['email', event.user.email],
              ['id', event.user.id],
              ['ip', event.user.ip],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </Shell>
  )
}

// --- settings: does the direction carry forms, prose and tables? ---------------

const INPUT = 'h-9 w-full min-w-0 border bg-card px-2.5 text-[14px] outline-none placeholder:text-muted-foreground focus:border-(--brand)'
const PLATFORMS = ['javascript-react', 'python-django', 'react-native'].map((p) => ({ key: p, label: p }))
const ROLES = ['Member', 'Admin', 'Manager', 'Owner'].map((r) => ({ key: r, label: r.toLowerCase() }))

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-medium lowercase">{label}</span>
      {children}
      {help && <span className="prose mt-1.5 block text-muted-foreground">{help}</span>}
    </label>
  )
}

function Block({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="border-t pt-6">
      <h2 className="text-[15px] font-semibold lowercase">{title}</h2>
      {intro && <p className="prose mt-1 max-w-[62ch] text-muted-foreground">{intro}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export function SettingsD({ proto }: { proto: Proto }) {
  const [slug, setSlug] = useState('web-app')
  const project = PROJECT_DETAILS.find((p) => p.slug === slug) ?? PROJECT_DETAILS[0]!
  const [name, setName] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [throttle, setThrottle] = useState<string | null>(null)
  const [scrub, setScrub] = useState<boolean | null>(null)
  const [role, setRole] = useState('Member')
  const [copied, setCopied] = useState(false)
  useKeys({})
  const projectNav = ['general', 'client keys', 'alerts', 'environments']
  const line = (
    <>
      <span className="text-muted-foreground">settings</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground max-md:hidden">projects</span>
      <span className="text-muted-foreground max-md:hidden">/</span>
      <Menu className="h-7 rounded-none px-1.5 font-semibold" value={slug} options={PROJECT_DETAILS.map((p) => ({ key: p.slug, label: p.slug }))} onChange={setSlug} />
    </>
  )
  return (
    <Shell proto={proto} section="settings" line={line}>
      <div className="flex gap-5 overflow-x-auto border-b px-3 lg:hidden">
        {projectNav.map((n) => (
          <button key={n} className={cn('h-10 shrink-0 cursor-pointer whitespace-nowrap', n === 'general' ? 'font-semibold shadow-[inset_0_-2px_0_var(--brand)]' : 'text-muted-foreground')}>
            {n}
          </button>
        ))}
      </div>
      <div className="grid flex-1 lg:grid-cols-[232px_minmax(0,1fr)]">
        <nav className="border-r py-5 max-lg:hidden">
          <div className="px-4">
            <Label>organization</Label>
          </div>
          {['general', 'members', 'teams', 'projects', 'api tokens'].map((n) => (
            <button key={n} className="block h-8 w-full cursor-pointer px-4 text-left text-muted-foreground hover:bg-accent hover:text-foreground">
              {n}
            </button>
          ))}
          <div className="mt-5 px-4">
            <Label>{project.slug}</Label>
          </div>
          {projectNav.map((n) => (
            <button
              key={n}
              className={cn('block h-8 w-full cursor-pointer px-4 text-left', n === 'general' ? 'bg-accent font-semibold shadow-[inset_2px_0_0_var(--brand)]' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
            >
              {n}
            </button>
          ))}
        </nav>
        <div className="min-w-0 px-3 py-6 pb-12 md:px-8">
          <div className="max-w-[720px] space-y-8">
            <div>
              <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{project.slug}</h1>
              <p className="mt-1.5 text-muted-foreground">
                {project.platform} · team {project.teams.join(', ')} · created {dayLabel(project.created)}
              </p>
            </div>

            <Block title="Client key" intro="Give this DSN to the SDK in your app. Every event sent with it is filed under this project.">
              <div className="flex gap-2">
                <input readOnly value={project.dsn} onFocus={(e) => e.target.select()} className={INPUT} />
                <Btn
                  className="h-9 w-[76px]"
                  onClick={() => {
                    void navigator.clipboard?.writeText(project.dsn)
                    setCopied(true)
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Btn>
              </div>
              <pre className="overflow-x-auto border bg-(--code-bg) px-3 py-2.5 leading-[1.65]">
                {`import * as Sentry from '@sentry/react'\n\nSentry.init({\n  dsn: '${project.dsn}',\n  release: '1.5.0',\n})`}
              </pre>
            </Block>

            <Block title="General">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name">
                  <input value={name ?? project.slug} onChange={(e) => setName(e.target.value)} className={INPUT} />
                </Field>
                <Field label="Platform">
                  <Menu className="h-9 w-full justify-between rounded-none border bg-card px-2.5 text-[14px]" value={platform ?? project.platform} options={PLATFORMS} onChange={setPlatform} />
                </Field>
              </div>
              <Field
                label="Event throttle rate"
                help="The share of incoming events to drop before they are stored. Raise it when a noisy release floods the project and you still need room in your quota; 0 keeps every event."
              >
                <div className="flex w-32 items-center border bg-card focus-within:border-(--brand)">
                  <input inputMode="numeric" value={throttle ?? String(project.throttle)} onChange={(e) => setThrottle(e.target.value)} className={cn(INPUT, 'border-0 text-right')} />
                  <span className="pr-2.5 text-muted-foreground">%</span>
                </div>
              </Field>
              <div className="flex gap-3">
                <Checkbox checked={scrub ?? project.scrubIp} onChange={() => setScrub(!(scrub ?? project.scrubIp))} className="mt-0.5 rounded-none" />
                <div>
                  <div className="font-medium">scrub IP addresses</div>
                  <p className="prose mt-0.5 text-muted-foreground">Store events without the IP address they were sent from.</p>
                </div>
              </div>
              <Btn primary className="h-9 px-4">
                Save changes
              </Btn>
            </Block>

            <Block title="Members" intro={`Everyone in team ${project.teams.join(', ')} can see and triage this project's issues.`}>
              <div className="border bg-card">
                <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-x-4 border-b px-3 py-1.5 text-[12px] tracking-[0.12em] text-muted-foreground uppercase md:grid-cols-[minmax(0,1fr)_100px_100px_100px]">
                  <span>member</span>
                  <span>role</span>
                  <span className="max-md:hidden">team</span>
                  <span className="max-md:hidden">joined</span>
                </div>
                {MEMBERS.map((m) => (
                  <div key={m.email} className="grid grid-cols-[minmax(0,1fr)_84px] items-center gap-x-4 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_100px_100px_100px]">
                    <span className="truncate">{m.email}</span>
                    <span>{m.role.toLowerCase()}</span>
                    <span className="max-md:hidden">{project.teams[0]}</span>
                    <span className="text-muted-foreground max-md:hidden">{dayLabel(m.joined)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <input type="email" placeholder="name@company.com" aria-label="Email to invite" className={cn(INPUT, 'flex-1 basis-56')} />
                <Menu className="h-9 rounded-none border bg-card px-2.5 text-[14px]" value={role} options={ROLES} onChange={setRole} align="right" />
                <Btn className="h-9 px-4">Invite</Btn>
              </div>
            </Block>

            <Block title="Delete project" intro={`Deletes ${project.slug} together with all of its issues and events. This cannot be undone.`}>
              <Btn danger className="h-9 px-4">
                Delete project
              </Btn>
            </Block>
          </div>
        </div>
      </div>
    </Shell>
  )
}
