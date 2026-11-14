// THROWAWAY PROTOTYPE. Pieces every variant draws with its own tokens: the variant
// switcher, the mark, level glyphs, sparklines, menus, the command list and the
// event content blocks. Layout and shell are never shared.
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  ISSUES,
  PROJECTS,
  ago,
  clock,
  stamp,
  type Crumb,
  type EventDetail,
  type Facet,
  type Frame,
  type Issue,
  type Level,
} from './data'
import { VARIANTS, act, get, set, setStatusFilter, targets, useStore, type Proto } from './store'

// --- prototype chrome (not part of any design) -------------------------------

export function PrototypeSwitcher({ proto }: { proto: Proto }) {
  const at = VARIANTS.findIndex((v) => v.key === proto.variant)
  const cycle = (d: number) =>
    proto.setSearch({ variant: VARIANTS[(at + d + VARIANTS.length) % VARIANTS.length]?.key })
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      if (e.key === 'ArrowLeft') cycle(-1)
      if (e.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  if (import.meta.env.PROD || proto.search.bar === 0) return null
  const current = VARIANTS[at]
  return (
    <div
      className="fixed bottom-3 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#111] px-1.5 py-1 text-[12px] text-white shadow-[0_6px_24px_rgba(0,0,0,.35)] ring-1 ring-white/20"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <button className="cursor-pointer rounded-full p-1 hover:bg-white/15" onClick={() => cycle(-1)} aria-label="Previous variant">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-36 text-center font-medium whitespace-nowrap">
        {current?.key.toUpperCase()} · {current?.name}
      </span>
      <button className="cursor-pointer rounded-full p-1 hover:bg-white/15" onClick={() => cycle(1)} aria-label="Next variant">
        <ChevronRight className="size-4" />
      </button>
      <button
        className="cursor-pointer rounded-full px-2 py-1 text-white/70 hover:bg-white/15"
        onClick={() => proto.setSearch({ theme: proto.dark ? 'light' : 'dark' })}
      >
        {proto.dark ? 'Dark' : 'Light'}
      </button>
    </div>
  )
}

// --- brand and small marks ---------------------------------------------------

/** The Faultline mark: one stratum line, slipped along a fault. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5', className)} fill="none" aria-hidden>
      <path d="M2 8h8l4 8h8" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="miter" />
    </svg>
  )
}

const LEVEL_VAR: Record<Level, string> = {
  error: 'var(--lv-error)',
  warning: 'var(--lv-warning)',
  info: 'var(--lv-info)',
}
export const levelColor = (l: Level) => LEVEL_VAR[l]

/** Level by shape as well as colour: square error, triangle warning, circle info. */
export function LevelGlyph({ level, className }: { level: Level; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={cn('size-2.5 shrink-0', className)} fill={LEVEL_VAR[level]} role="img" aria-label={level}>
      {level === 'error' && <rect x="1" y="1" width="8" height="8" rx="1.5" />}
      {level === 'warning' && <path d="M5 .8 9.6 9H.4Z" />}
      {level === 'info' && <circle cx="5" cy="5" r="4" />}
    </svg>
  )
}

export function Bars({
  data,
  className,
  color = 'currentColor',
  gap = 1,
}: {
  data: number[]
  className?: string
  color?: string
  gap?: number
}) {
  const max = Math.max(1, ...data)
  const w = 100 / data.length
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={cn('h-6 w-24', className)} aria-hidden>
      {data.map((v, i) => {
        const h = v === 0 ? 1 : 3 + (v / max) * 21
        return (
          <rect
            key={i}
            x={i * w + gap / 2}
            y={24 - h}
            width={Math.max(0.5, w - gap)}
            height={h}
            fill={color}
            opacity={v === 0 ? 0.22 : 1}
          />
        )
      })}
    </svg>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-current/20 px-1 font-mono text-[10.5px] leading-none font-medium opacity-70',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Checkbox({ checked, onChange, className }: { checked: boolean; onChange: () => void; className?: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        'grid size-4 shrink-0 cursor-pointer place-items-center rounded-[4px] border transition-colors',
        checked ? 'border-(--brand) bg-(--brand) text-(--brand-fg)' : 'border-foreground/25 hover:border-foreground/50',
        className,
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  )
}

export function Menu<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  align = 'left',
}: {
  value: T
  options: { key: T; label: string }[]
  onChange: (v: T) => void
  label?: string
  className?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] whitespace-nowrap hover:bg-accent',
          className,
        )}
      >
        {label && <span className="text-muted-foreground">{label}</span>}
        <span>{options.find((o) => o.key === value)?.label}</span>
        <ChevronsUpDown className="size-3 text-muted-foreground" />
      </button>
      {open && (
        <div
          className={cn(
            'absolute top-8 z-50 min-w-40 rounded-md border bg-popover p-1 text-[13px] text-popover-foreground shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                onChange(o.key)
                setOpen(false)
              }}
              className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-left hover:bg-accent"
            >
              {o.label}
              {o.key === value && <Check className="size-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const PROJECT_OPTIONS = [{ key: '', label: 'All projects' }, ...PROJECTS.map((p) => ({ key: p.slug, label: p.slug }))]
export const ENV_OPTIONS = [
  { key: '', label: 'All environments' },
  { key: 'production', label: 'production' },
  { key: 'staging', label: 'staging' },
]

// --- command palette ---------------------------------------------------------

type Command = { group: string; label: string; hint?: string; keys?: string; run: () => void }

function useCommands(proto: Proto): Command[] {
  const s = useStore()
  return useMemo(() => {
    const n = targets(s).length
    const subject = n > 1 ? `${n} issues` : (ISSUES.find((i) => i.id === targets(s)[0])?.shortId ?? 'issue')
    const nav = ['Issues', 'Releases', 'Uptime', 'Logs', 'Alerts', 'Settings']
    return [
      { group: 'Actions', label: `Resolve ${subject}`, keys: 'E', run: () => act('resolve') },
      { group: 'Actions', label: `Ignore ${subject}`, keys: 'I', run: () => act('ignore') },
      { group: 'Actions', label: `Assign ${subject} to me`, keys: 'A', run: () => act('assign') },
      { group: 'Actions', label: 'Merge selected issues', keys: 'M', run: () => set({ selected: [] }) },
      ...nav.map((label) => ({
        group: 'Go to',
        label,
        run: () => (label === 'Settings' && proto.variant === 'd' ? proto.toSettings() : proto.toInbox()),
      })),
      ...PROJECT_OPTIONS.map((p) => ({
        group: 'Project',
        label: p.label,
        run: () => set({ project: p.key || null, selected: [] }),
      })),
      { group: 'View', label: 'Show unresolved', run: () => setStatusFilter('unresolved') },
      { group: 'View', label: 'Show resolved', run: () => setStatusFilter('resolved') },
      { group: 'View', label: 'Show ignored', run: () => setStatusFilter('ignored') },
      {
        group: 'View',
        label: proto.dark ? 'Switch to light theme' : 'Switch to dark theme',
        run: () => proto.setSearch({ theme: proto.dark ? 'light' : 'dark' }),
      },
      ...ISSUES.map((i) => ({
        group: 'Issues',
        label: `${i.type}: ${i.value}`,
        hint: i.shortId,
        run: () => proto.openIssue(i.id),
      })),
    ]
  }, [s, proto])
}

/**
 * Input and result list of the command palette. Each variant decides where it
 * lives (a centred dialog in A and B, the command line itself in C).
 */
export function PaletteBody({
  proto,
  prefix,
  className,
  inputClassName,
  listClassName,
  lower,
}: {
  proto: Proto
  prefix?: ReactNode
  className?: string
  inputClassName?: string
  listClassName?: string
  /** Variant D: lowercase labels, and projects only once the user types. */
  lower?: boolean
}) {
  const all = useCommands(proto)
  const commands = useMemo(
    () =>
      lower
        ? all.map((c) => ({ ...c, group: c.group.toLowerCase(), label: c.group === 'Issues' ? c.label : c.label.charAt(0).toLowerCase() + c.label.slice(1) }))
        : all,
    [all, lower],
  )
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const hit = commands.filter((c) => words.every((w) => `${c.group} ${c.label} ${c.hint ?? ''}`.toLowerCase().includes(w)))
    return q ? hit : hit.filter((c) => c.group.toLowerCase() !== 'issues' && !(lower && c.group === 'project'))
  }, [commands, q])
  const run = (c?: Command) => {
    set({ palette: false })
    c?.run()
  }
  let lastGroup = ''
  return (
    <div className={className}>
      <div className={cn('flex items-center gap-2 border-b px-3', inputClassName)}>
        {prefix}
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setAt(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setAt(Math.min(shown.length - 1, at + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setAt(Math.max(0, at - 1))
            } else if (e.key === 'Enter') run(shown[at])
            else if (e.key === 'Escape') set({ palette: false })
          }}
          placeholder={lower ? 'run a command or find an issue' : 'Run a command or find an issue'}
          className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
        />
        <Kbd>esc</Kbd>
      </div>
      <div className={cn('max-h-[52vh] overflow-y-auto p-1', listClassName)}>
        {shown.map((c, i) => {
          const head = c.group !== lastGroup
          lastGroup = c.group
          return (
            <div key={`${c.group}${c.label}`}>
              {head && <div className={cn('px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground', !lower && 'uppercase')}>{c.group}</div>}
              <button
                onMouseEnter={() => setAt(i)}
                onClick={() => run(c)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-left text-[13px]',
                  i === at && 'bg-accent text-accent-foreground',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                {c.hint && <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{c.hint}</span>}
                {c.keys && <Kbd>{c.keys}</Kbd>}
              </button>
            </div>
          )
        })}
        {shown.length === 0 && <div className="px-2 py-6 text-center text-[13px] text-muted-foreground">No match for “{q}”</div>}
      </div>
    </div>
  )
}

export function ModalPalette({ proto, className, lower, listClassName }: { proto: Proto; className?: string; lower?: boolean; listClassName?: string }) {
  const { palette } = useStore()
  if (!palette) return null
  return (
    <div className="fixed inset-0 z-[90] bg-black/35 px-3 pt-[14vh]" onMouseDown={() => set({ palette: false })}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn('mx-auto w-full max-w-[600px] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-2xl', className)}
      >
        <PaletteBody proto={proto} lower={lower} listClassName={listClassName} />
      </div>
    </div>
  )
}

// --- event content blocks ----------------------------------------------------

function FrameRow({ frame, open, onToggle, first }: { frame: Frame; open: boolean; onToggle: () => void; first: boolean }) {
  const hasContext = frame.context.length > 0
  return (
    <div className={cn(!first && 'border-t')}>
      <button
        onClick={onToggle}
        disabled={!hasContext}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[12.5px]',
          hasContext && 'cursor-pointer hover:bg-accent',
          !frame.inApp && 'text-muted-foreground',
        )}
      >
        <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', !open && '-rotate-90', !hasContext && 'opacity-0')} />
        <span className="min-w-0 max-md:break-all md:truncate">
          <span className={cn(frame.inApp && 'font-medium')}>{frame.filename}</span>
          <span className="text-muted-foreground"> in </span>
          <span className={cn(frame.inApp && 'font-medium')}>{frame.fn}</span>
          <span className="text-muted-foreground"> at line </span>
          {frame.line}
        </span>
        {frame.inApp && (
          <span className="ml-auto shrink-0 rounded-sm border px-1 text-[10.5px] tracking-wide text-muted-foreground uppercase">in app</span>
        )}
      </button>
      {open && hasContext && (
        <pre className="overflow-x-auto border-t bg-(--code-bg) py-1.5 font-mono text-[12.5px] leading-[1.65]">
          {frame.context.map(([n, text]) => (
            <div key={n} className={cn('flex min-w-max pr-4', n === frame.line && 'bg-(--hit) shadow-[inset_2px_0_0_var(--lv-error)]')}>
              <span className={cn('w-12 shrink-0 pr-3 text-right select-none', n === frame.line ? 'text-(--lv-error)' : 'text-muted-foreground/70')}>
                {n}
              </span>
              <span>{text || ' '}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  )
}

/** In-app frames open with their source context; a run of library frames folds into one row. */
export function StackTrace({ event, className }: { event: EventDetail; className?: string }) {
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [showLib, setShowLib] = useState(false)
  const lib = event.frames.filter((f) => !f.inApp).length
  let firstShown = true
  return (
    <div className={cn('overflow-hidden rounded-md border', className)}>
      {event.frames.map((f, i) => {
        if (!f.inApp && !showLib) return null
        const first = firstShown
        firstShown = false
        return (
          <FrameRow
            key={i}
            frame={f}
            first={first}
            open={open[i] ?? (f.inApp && f.context.length > 0)}
            onToggle={() => setOpen({ ...open, [i]: !(open[i] ?? f.inApp) })}
          />
        )
      })}
      {lib > 0 && (
        <button
          onClick={() => setShowLib(!showLib)}
          className="flex w-full cursor-pointer items-center gap-2 border-t px-3 py-1.5 text-left font-mono text-[12px] text-muted-foreground hover:bg-accent"
        >
          <ChevronDown className={cn('size-3.5', !showLib && '-rotate-90')} />
          {showLib ? 'Hide' : 'Show'} {lib} library {lib === 1 ? 'frame' : 'frames'}
        </button>
      )}
    </div>
  )
}

export function crumbLabel(c: Crumb) {
  return c.status ? `${c.message} → ${c.status}` : c.message
}

export function Crumbs({ event, issue, className }: { event: EventDetail; issue: Issue; className?: string }) {
  const rows = [
    ...event.crumbs.map((c) => ({ at: c.at, category: c.category, text: crumbLabel(c), crash: false })),
    { at: event.at, category: 'exception', text: `${issue.type}: ${issue.value}`, crash: true },
  ]
  return (
    <div className={cn('overflow-hidden rounded-md border font-mono text-[12.5px]', className)}>
      {rows.map((r, i) => (
        <div key={i} className={cn('flex items-baseline gap-3 px-3 py-1.5', i > 0 && 'border-t', r.crash && 'bg-(--hit)')}>
          <span className="w-16 shrink-0 text-muted-foreground tabular-nums">{clock(r.at)}</span>
          <span className={cn('w-20 shrink-0', r.crash ? 'text-(--lv-error)' : 'text-muted-foreground')}>{r.category}</span>
          <span className="min-w-0 break-words">{r.text}</span>
        </div>
      ))}
    </div>
  )
}

export function Facets({ facets, className, barClassName }: { facets: Facet[]; className?: string; barClassName?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {facets.map((f) => (
        <div key={f.key}>
          <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
            <span className="font-mono font-medium">{f.key}</span>
            {f.top.length === 0 && <span className="text-muted-foreground">{f.unique} values</span>}
          </div>
          <div className="space-y-1">
            {f.top.map((v) => {
              const pct = Math.round((v.count / f.total) * 100)
              return (
                <button
                  key={v.value}
                  onClick={() => set({ query: `${get().query} ${f.key}:${v.value}`.trim() })}
                  className="group relative flex h-6 w-full cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-sm px-1.5 text-[12.5px]"
                >
                  <span className={cn('absolute inset-y-0 left-0 bg-foreground/8 group-hover:bg-foreground/14', barClassName)} style={{ width: `${pct}%` }} />
                  <span className="relative truncate">{v.value}</span>
                  <span className="relative text-muted-foreground tabular-nums">{pct}%</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function KeyValues({ rows, className }: { rows: { label: string; value: string }[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12.5px]', className)}>
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 truncate font-mono">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function JsonView({ event, className }: { event: EventDetail; className?: string }) {
  return (
    <pre className={cn('max-h-[70vh] overflow-auto rounded-md border bg-(--code-bg) p-3 font-mono text-[12px] leading-[1.6]', className)}>
      {event.json}
    </pre>
  )
}

export function eventLabel(event: EventDetail) {
  return `${event.id.slice(0, 8)} · ${stamp(event.at)}`
}

export function seenLine(issue: Issue) {
  return `${ago(issue.lastSeen)} ago`
}

/** The issue an issue screen shows: `?id=` on arrival, then wherever j/k moves the cursor. */
export function useOpenIssue(proto: Proto): Issue {
  useStore()
  const id = proto.id ?? '1'
  const seen = useRef<string | null>(null)
  useEffect(() => {
    if (id !== seen.current) {
      seen.current = id
      if (get().cursor !== id) set({ cursor: id, eventIndex: 0 })
    } else if (get().cursor && get().cursor !== id) {
      seen.current = get().cursor
      proto.setSearch({ id: get().cursor })
    }
  })
  return ISSUES.find((i) => i.id === id) ?? (ISSUES[0] as Issue)
}
