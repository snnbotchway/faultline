// THROWAWAY PROTOTYPE · Variant C "Seismograph".
// One typewriter face, no sidebar: a command line is the shell. Every issue is a
// channel on one shared 14-day time axis, with releases marked across all of
// them, grouped new / spiking / ongoing. Enter unfolds a row in place into a
// three-column dossier that follows the cursor; Enter again opens the full page.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  DAY,
  DAYS,
  EVENT_COUNT,
  FACETS,
  NOW,
  ORG,
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
  LevelGlyph,
  Mark,
  Menu,
  PROJECT_OPTIONS,
  PaletteBody,
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
const P = 6 // trace points per day

function wobble(seed: number, j: number) {
  const x = Math.sin(seed * 12.9898 + j * 78.233) * 43758.5453
  return 0.55 + 0.45 * (x - Math.floor(x))
}

/**
 * A seismograph channel: the trace swings wider on days with more events
 * (square-root gain, so quiet issues still register next to loud ones).
 */
function Trace({ data, max, color, seed, className, p = P }: { data: number[]; max: number; color: string; seed: number; className?: string; p?: number }) {
  const amp = data.map((v) => (v > 0 ? Math.max(0.14, Math.sqrt(v / max)) : 0))
  const n = data.length * p
  let d = ''
  for (let j = 0; j <= n; j++) {
    const t = j / p - 0.5
    const d0 = Math.max(0, Math.min(data.length - 1, Math.floor(t)))
    const d1 = Math.min(data.length - 1, d0 + 1)
    const f = Math.max(0, Math.min(1, t - d0))
    const a = (amp[d0] ?? 0) * (1 - f) + (amp[d1] ?? 0) * f
    const y = 50 - (j % 2 ? 1 : -1) * a * wobble(seed, j) * 47
    d += `${j === 0 ? 'M' : 'L'}${j} ${y.toFixed(1)}`
  }
  return (
    <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className={cn('block h-8 w-full', className)} aria-hidden>
      <path d={`M0 50H${n}`} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const releasePct = (at: number) => (1 - (NOW - at) / (DAYS * DAY)) * 100
const DAY_GRID = {
  backgroundImage: 'linear-gradient(to right, var(--grid) 1px, transparent 1px)',
  backgroundSize: `${100 / DAYS}% 100%`,
}

/** A lane on the shared time axis: day grid, release lines, then the content. */
function Lane({ children, labels, className, row }: { children?: ReactNode; labels?: boolean; className?: string; row?: boolean }) {
  return (
    <div className={cn('relative self-stretch border-x border-(--grid)', className)} style={DAY_GRID}>
      {RELEASES.map((r) => (
        <div key={r.version} className={cn('absolute inset-y-0 border-l border-dashed border-foreground/35', row && 'max-lg:hidden')} style={{ left: `${releasePct(r.at)}%` }}>
          {labels && <span className="absolute top-0 left-1 bg-background px-0.5 text-[10.5px] leading-4 text-muted-foreground">{r.version}</span>}
        </div>
      ))}
      <div className="relative flex h-full items-center">{children}</div>
    </div>
  )
}

function TextButton({ keys, children, onClick, className }: { keys?: string; children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn('cursor-pointer whitespace-nowrap underline-offset-4 hover:underline', className)}
    >
      {keys && <span className="mr-1 text-(--brand)">[{keys}]</span>}
      {children}
    </button>
  )
}

function Shell({ proto, line, children }: { proto: Proto; line: ReactNode; children: ReactNode }) {
  const s = useStore()
  useEffect(() => {
    set({ grouped: true })
    return () => set({ grouped: false })
  }, [])
  return (
    <div className="proto vc flex flex-col">
      <header className="flex h-10 shrink-0 items-center gap-4 border-b px-3 md:px-4">
        <button onClick={proto.toInbox} className="flex cursor-pointer items-center gap-2">
          <Mark className="size-[18px] text-(--brand)" />
          <span className="text-[12px] font-semibold tracking-[0.18em]">FAULTLINE</span>
        </button>
        <div className="flex items-center text-muted-foreground">
          <span className="px-1 max-md:hidden">{ORG.toLowerCase()}</span>
          <span className="max-md:hidden">/</span>
          <Menu className="h-6 rounded-none px-1.5 text-[12.5px] text-foreground" value={s.project ?? ''} options={PROJECT_OPTIONS.map((o) => ({ ...o, label: o.label.toLowerCase() }))} onChange={(v) => set({ project: v || null, selected: [] })} />
          <span className="max-md:hidden">/</span>
          <Menu className="h-6 rounded-none px-1.5 text-[12.5px] text-foreground max-md:hidden" value={s.env ?? ''} options={ENV_OPTIONS.map((o) => ({ ...o, label: o.label.toLowerCase() }))} onChange={(v) => set({ env: v || null })} />
        </div>
        <nav className="ml-auto flex items-center gap-4 border-r pr-4 max-lg:hidden">
          {NAV.map((n) => (
            <button
              key={n}
              onClick={proto.toInbox}
              className={cn('cursor-pointer underline-offset-[13px] hover:text-foreground', n === 'issues' ? 'underline decoration-(--brand) decoration-2' : 'text-muted-foreground')}
            >
              {n}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 max-lg:ml-auto">
          <button onClick={() => proto.setSearch({ theme: proto.dark ? 'light' : 'dark' })} aria-label="Switch theme" className="cursor-pointer text-[15px] leading-none text-muted-foreground hover:text-foreground">
            {proto.dark ? '◑' : '◐'}
          </button>
          <button onClick={() => set({ palette: true })} className="cursor-pointer border px-1.5 py-0.5 text-[11.5px] hover:bg-accent">
            ⌘K
          </button>
        </div>
      </header>
      <div className="sticky top-0 z-30 h-11 shrink-0 border-b bg-card">
        {s.palette ? (
          <>
            <div className="fixed inset-0 top-0 z-40 bg-black/25" onMouseDown={() => set({ palette: false })} />
            <PaletteBody
              proto={proto}
              prefix={<span className="font-semibold text-(--brand)">:</span>}
              className="absolute inset-x-0 top-0 z-50 border-b bg-card shadow-[0_18px_40px_-12px_rgba(0,0,0,.45)]"
              inputClassName="md:px-4"
            />
          </>
        ) : (
          <div className="flex h-full items-center gap-3 px-3 md:px-4">{line}</div>
        )}
      </div>
      {children}
    </div>
  )
}

const ROW = 'grid grid-cols-[30px_minmax(0,1fr)_84px] lg:grid-cols-[34px_minmax(0,5fr)_minmax(0,6fr)_60px_60px_56px] items-center'
const GROUPS: { key: Trend; label: string }[] = [
  { key: 'new', label: 'new' },
  { key: 'spiking', label: 'spiking' },
  { key: 'ongoing', label: 'ongoing' },
]

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
                  <span className="block h-full bg-foreground/55" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-8 text-right text-muted-foreground">{pct}%</span>
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
      <div className="border-l border-foreground/30">
        {event.crumbs.map((c, i) => (
          <div key={i} className="relative flex gap-3 py-1 pl-4">
            <span className="absolute top-[11px] -left-[3px] size-[5px] rounded-full bg-foreground/50" />
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
              <span className={cn('w-11 shrink-0 pr-3 text-right select-none', n === top.line ? 'text-(--lv-error)' : 'text-muted-foreground/70')}>{n}</span>
              <span>{text || ' '}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{children}</div>
}

function Dossier({ issue, proto }: { issue: Issue; proto: Proto }) {
  const event = eventFor(issue, 0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
    ref.current?.previousElementSibling?.scrollIntoView({ block: 'nearest' })
  }, [issue.id])
  return (
    <div ref={ref} className="scroll-mb-4 border-b bg-card shadow-[inset_2px_0_0_var(--brand)]">
      <div className="grid gap-x-8 gap-y-5 px-4 py-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] lg:pl-[34px]">
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
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-dashed px-4 py-2 lg:pl-[34px]">
        <TextButton keys="e" onClick={() => act('resolve', [issue.id])}>
          resolve
        </TextButton>
        <TextButton keys="i" onClick={() => act('ignore', [issue.id])}>
          ignore
        </TextButton>
        <TextButton keys="a" onClick={() => act('assign', [issue.id])}>
          assign to me
        </TextButton>
        <TextButton keys="↵" onClick={() => proto.openIssue(issue.id)} className="ml-auto">
          open full issue
        </TextButton>
      </div>
    </div>
  )
}

function StatusLine() {
  const st = useStore()
  const counts = statusCounts(st)
  const status = currentStatus(st)
  return (
    <div className="flex h-8 shrink-0 items-center gap-3 border-b px-3 md:gap-4 md:px-4">
      {(['unresolved', 'resolved', 'ignored'] as const).map((k) => (
        <button key={k} onClick={() => setStatusFilter(k)} className={cn('cursor-pointer whitespace-nowrap', status === k ? 'font-semibold' : 'text-muted-foreground hover:text-foreground')}>
          {k} {counts[k]}
        </button>
      ))}
      <div className="ml-auto flex items-center text-muted-foreground">
        <span className="max-md:hidden">sort</span>
        <Menu className="h-6 rounded-none px-1.5 text-[12.5px]" value={st.sort} options={SORTS.map((o) => ({ ...o, label: o.label.toLowerCase() }))} onChange={(sort) => set({ sort })} align="right" />
      </div>
    </div>
  )
}

export function InboxC({ proto }: { proto: Proto }) {
  const st = useStore()
  const [peek, setPeek] = useState(false)
  const list = visible(st)
  const totals = Array.from({ length: DAYS }, (_, d) => list.reduce((sum, i) => sum + (i.d14[d] ?? 0), 0))
  const rowMax = Math.max(1, ...list.flatMap((i) => i.d14))
  const events = totals.reduce((a, b) => a + b, 0)
  useKeys({
    onEnter: () => (peek ? st.cursor && proto.openIssue(st.cursor) : setPeek(true)),
    onEscape: () => setPeek(false),
  })
  const line =
    st.selected.length > 0 ? (
      <>
        <span className="font-semibold whitespace-nowrap">{st.selected.length} selected</span>
        <span className="text-muted-foreground">›</span>
        <div className="flex min-w-0 items-center gap-4 overflow-x-auto">
          <TextButton keys="e" onClick={() => act('resolve')}>
            resolve
          </TextButton>
          <TextButton keys="i" onClick={() => act('ignore')}>
            ignore
          </TextButton>
          <TextButton keys="a" onClick={() => act('assign')}>
            assign to me
          </TextButton>
          <TextButton keys="m" onClick={() => set({ selected: [] })}>
            merge
          </TextButton>
        </div>
        <TextButton keys="esc" onClick={() => set({ selected: [] })} className="ml-auto text-muted-foreground">
          clear
        </TextButton>
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
          className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
        />
        <span className="whitespace-nowrap text-muted-foreground max-md:hidden">
          <span className="text-(--brand)">[/]</span> search <span className="ml-2 text-(--brand)">[⌘K]</span> commands
        </span>
      </>
    )
  return (
    <Shell proto={proto} line={line}>
      <StatusLine />
      <div className={cn(ROW, 'border-b max-lg:grid-cols-1')}>
        <div className="max-lg:hidden" />
        <div className="flex items-end gap-8 py-3 max-lg:px-3">
          <div>
            <div className="text-[26px] leading-none font-semibold tracking-tight">{events}</div>
            <div className="mt-1 text-muted-foreground">events / 14 days</div>
          </div>
          {GROUPS.slice(0, 2).map((g) => (
            <div key={g.key}>
              <div className={cn('text-[26px] leading-none font-semibold tracking-tight', g.key === 'spiking' && 'text-(--lv-error)')}>
                {list.filter((i) => i.trend === g.key).length}
              </div>
              <div className="mt-1 text-muted-foreground">{g.label}</div>
            </div>
          ))}
        </div>
        <Lane labels className="h-[84px] max-lg:mx-3 max-lg:h-[64px]">
          <Trace data={totals} max={Math.max(1, ...totals)} color="var(--foreground)" seed={99} className="h-[68px] pt-4 max-lg:h-[52px]" />
        </Lane>
        <div className="col-span-3 max-lg:hidden" />
      </div>
      <div className={cn(ROW, 'h-6 border-b text-[11px] tracking-[0.14em] text-muted-foreground uppercase max-lg:block')}>
        <div className="max-lg:hidden" />
        <div className="max-lg:hidden">issue</div>
        <div className="flex h-full border-x border-(--grid) tracking-normal normal-case max-lg:mx-3">
          {Array.from({ length: DAYS }, (_, d) => {
            const date = new Date(NOW - (DAYS - 1 - d) * DAY)
            return (
              <span key={d} className="flex-1 overflow-visible pl-1 leading-6 whitespace-nowrap">
                {d % 2 === 0 ? (d === 0 ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : date.getUTCDate()) : ''}
              </span>
            )
          })}
        </div>
        <div className="text-right max-lg:hidden">events</div>
        <div className="text-right max-lg:hidden">users</div>
        <div className="pr-3 text-right max-lg:hidden">seen</div>
      </div>

      {GROUPS.map((g) => {
        const rows = list.filter((i) => i.trend === g.key)
        if (rows.length === 0) return null
        return (
          <Fragment key={g.key}>
            <div className={cn(ROW, 'h-7 border-b bg-muted text-[11px] tracking-[0.14em] uppercase')}>
              <div />
              <div className="col-span-2 lg:col-span-5">
                <span className={cn('font-semibold', g.key === 'spiking' && 'text-(--lv-error)', g.key === 'new' && 'text-(--brand)')}>{g.label}</span>
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
                      setPeek(!open)
                      set({ cursor: i.id })
                    }}
                    className={cn(
                      ROW,
                      'h-10 scroll-mt-12 cursor-pointer border-b max-lg:h-[52px]',
                      on ? 'bg-(--row-on)' : cur ? 'bg-accent' : 'hover:bg-accent/60',
                      cur && 'shadow-[inset_2px_0_0_var(--brand)]',
                    )}
                  >
                    <div className="grid place-items-center self-stretch">
                      <Checkbox checked={on} onChange={() => toggleSelect(i.id)} className="size-3.5 rounded-none" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <LevelGlyph level={i.level} className="size-2" />
                        <span className="truncate">
                          <span className="font-semibold">{i.type}</span>
                          <span className="ml-2 text-foreground/75">{i.value}</span>
                        </span>
                        <span className="ml-auto shrink-0 pl-2 text-[11.5px] text-muted-foreground max-lg:hidden">{i.shortId}</span>
                      </div>
                      <div className="pl-4 text-[11.5px] text-muted-foreground lg:hidden">
                        {i.shortId} · {ago(i.lastSeen)} · {i.count} ev
                      </div>
                    </div>
                    <Lane row className="max-lg:mr-3 max-lg:border-0 max-lg:bg-none">
                      <Trace data={i.d14} max={rowMax} color={levelColor(i.level)} seed={Number(i.id)} className="max-lg:hidden" />
                      <Trace data={i.d14} max={rowMax} color={levelColor(i.level)} seed={Number(i.id)} p={2} className="lg:hidden" />
                    </Lane>
                    <div className="text-right max-lg:hidden">{i.count}</div>
                    <div className="text-right max-lg:hidden">{i.users}</div>
                    <div className="pr-3 text-right text-muted-foreground max-lg:hidden">{ago(i.lastSeen)}</div>
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
          <TextButton onClick={() => set({ query: 'is:unresolved', project: null })} className="text-(--brand)">
            clear filters
          </TextButton>
        </div>
      )}
    </Shell>
  )
}

export function IssueC({ proto }: { proto: Proto }) {
  const st = useStore()
  const issue = useOpenIssue(proto)
  const [json, setJson] = useState(false)
  const list = visible(st)
  const at = list.findIndex((i) => i.id === issue.id)
  const total = issue.id === '1' ? EVENT_COUNT : 1
  const event = eventFor(issue, st.eventIndex)
  const status = statusOf(st, issue.id)
  useKeys({ onEscape: proto.toInbox, events: total })
  const line = (
    <>
      <TextButton keys="esc" onClick={proto.toInbox} className="text-muted-foreground">
        issues
      </TextButton>
      <span className="text-muted-foreground">/</span>
      <span className="font-semibold whitespace-nowrap">{issue.shortId}</span>
      {at >= 0 && (
        <span className="whitespace-nowrap text-muted-foreground max-md:hidden">
          {at + 1} of {list.length}
        </span>
      )}
      <div className="ml-auto flex items-center gap-4">
        <TextButton keys="e" onClick={() => act('resolve', [issue.id])}>
          {status === 'resolved' ? 'unresolve' : 'resolve'}
        </TextButton>
        <TextButton keys="i" onClick={() => act('ignore', [issue.id])}>
          {status === 'ignored' ? 'unignore' : 'ignore'}
        </TextButton>
        <TextButton keys="a" onClick={() => act('assign', [issue.id])} className="max-md:hidden">
          {st.assignee[issue.id] ? 'assigned to me' : 'assign to me'}
        </TextButton>
      </div>
    </>
  )
  return (
    <Shell proto={proto} line={line}>
      <div className="grid border-b lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="px-3 py-5 md:px-4">
          <div className="flex items-center gap-2.5">
            <LevelGlyph level={issue.level} className="size-3" />
            <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{issue.type}</h1>
            {issue.trend !== 'ongoing' && <span className={cn('text-[11px] tracking-[0.14em] uppercase', issue.trend === 'new' ? 'text-(--brand)' : 'text-(--lv-error)')}>{issue.trend}</span>}
            {status !== 'unresolved' && <span className="text-[11px] tracking-[0.14em] text-(--ok) uppercase">{status}</span>}
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
                <div className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{label}</div>
                <div className="mt-0.5 text-[15px] font-semibold whitespace-nowrap">{value}</div>
                {release && <div className="text-muted-foreground">in {release}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col max-lg:px-3 max-lg:pb-3 lg:border-l">
          <Lane labels className="h-[150px] flex-1 max-lg:h-[96px] lg:border-x-0">
            <Trace data={issue.d14} max={Math.max(1, ...issue.d14)} color={levelColor(issue.level)} seed={Number(issue.id)} className="h-[120px] pt-4 max-lg:h-[80px]" />
          </Lane>
          <div className="flex h-6 border-t text-[11px] text-muted-foreground">
            {Array.from({ length: DAYS }, (_, d) => (
              <span key={d} className="flex-1 pl-1 leading-6 whitespace-nowrap">
                {d % 2 === 0 ? (d === 0 ? dayLabel(NOW - (DAYS - 1) * DAY) : new Date(NOW - (DAYS - 1 - d) * DAY).getUTCDate()) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6 px-3 py-5 md:px-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="text-muted-foreground">
              event <span className="text-foreground">{event.id.slice(0, 8)}</span> · {stamp(event.at)}
            </span>
            <div className="ml-auto flex items-center gap-4">
              <TextButton keys="[" onClick={() => set({ eventIndex: Math.min(total - 1, st.eventIndex + 1) })}>
                older
              </TextButton>
              <TextButton keys="]" onClick={() => set({ eventIndex: Math.max(0, st.eventIndex - 1) })}>
                newer
              </TextButton>
              <TextButton onClick={() => setJson(!json)} className={cn(json && 'font-semibold text-(--brand)')}>
                {'{ } json'}
              </TextButton>
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
                <textarea rows={2} placeholder="leave a comment" className="block w-full resize-none border bg-card px-3 py-2 outline-none placeholder:text-muted-foreground focus:border-(--brand)" />
              </section>
            </>
          )}
        </div>
        <aside className="space-y-6 px-3 py-5 max-lg:border-t md:px-4 lg:border-l">
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
