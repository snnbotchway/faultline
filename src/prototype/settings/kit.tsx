// THROWAWAY PROTOTYPE. Pieces the three settings variants share: the shell copy, the switcher, and small form parts.
// Layout is deliberately not shared; each variant owns its own.
import { Link, useNavigate } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Copy, Ellipsis, Monitor, Moon, Search, Sun, TriangleAlert, Package, Activity, Bell, type LucideIcon } from 'lucide-react'
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react'
import { Wordmark } from '@/components/mark'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Theme, setTheme, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { ORGS, OrgRole, ROLES, SCOPES, TEAMS, inviteLink, roleLabel, type Member, type Scope } from './data'

export const Variant = { a: 'a', b: 'b', c: 'c', d: 'd' } as const
export type Variant = (typeof Variant)[keyof typeof Variant]
export const VARIANT_NAMES: Record<Variant, string> = { a: 'Rail', b: 'Ledger', c: 'Places', d: 'Ledger, revised' }

export type ProtoSearch = {
  variant: Variant
  as?: OrgRole
  tab?: string
  open?: string
  created?: string
  q?: string
  email?: 'off'
  bar?: 0
}

type Proto = { variant: Variant; role: OrgRole; path: string; search: ProtoSearch; can: (scope: Scope) => boolean }
const ProtoContext = createContext<Proto | null>(null)

export function ProtoProvider({ path, search, children }: { path: string; search: ProtoSearch; children: ReactNode }) {
  const role = search.as ?? OrgRole.owner
  return <ProtoContext value={{ variant: search.variant, role, path, search, can: (scope) => SCOPES[role].includes(scope) }}>{children}</ProtoContext>
}

export function useProto(): Proto {
  const proto = use(ProtoContext)
  if (!proto) throw new Error('outside the prototype')
  return proto
}

type Extra = Pick<ProtoSearch, 'tab' | 'open' | 'created' | 'q'>
const carry = (prev: ProtoSearch, extra?: Extra): ProtoSearch => ({ variant: prev.variant, as: prev.as, email: prev.email, bar: prev.bar, ...extra })

// A link inside the prototype. `to` is the stock path ("/demo-co/settings/members"); the variant and role ride along.
export function PLink({ to, search, className, children, ...rest }: { to: string; search?: Extra; className?: string; children: ReactNode } & Omit<React.ComponentProps<'a'>, 'href'>) {
  return (
    <Link to="/prototype/settings/$" params={{ _splat: to.replace(/^\//, '') }} search={(prev) => carry(prev as ProtoSearch, search)} className={className} {...rest}>
      {children}
    </Link>
  )
}

export function useGo() {
  const navigate = useNavigate()
  return (to: string, search?: Extra, replace = false) =>
    void navigate({ to: '/prototype/settings/$', params: { _splat: to.replace(/^\//, '') }, search: (prev) => carry(prev as ProtoSearch, search), replace })
}

/* ---------- shell: a copy of the real top bar and tab bar, with the navigation each variant proposes ---------- */

export type NavItem = { label: string; to?: string; current?: boolean; icon?: LucideIcon }

const THEMES = [
  { value: Theme.system, label: 'System', icon: Monitor },
  { value: Theme.light, label: 'Light', icon: Sun },
  { value: Theme.dark, label: 'Dark', icon: Moon },
]

const INERT: NavItem[] = [
  { label: 'Issues', icon: TriangleAlert },
  { label: 'Releases', icon: Package },
  { label: 'Uptime', icon: Activity },
  { label: 'Logs' },
  { label: 'Alerts', icon: Bell },
]

function NavLink({ item, className, children }: { item: NavItem; className?: string; children: ReactNode }) {
  return item.to ? (
    <PLink to={item.to} className={className}>
      {children}
    </PLink>
  ) : (
    <span className={cn(className, 'cursor-default')}>{children}</span>
  )
}

export function ProtoShell({
  org,
  nav,
  orgMenu,
  more,
  children,
}: {
  org: string
  // Section links after the inert ones (Issues, Releases, …).
  nav: NavItem[]
  // Extra items in the organization menu.
  orgMenu?: NavItem[]
  // What the phone's "More" tab lists.
  more: NavItem[]
  children: ReactNode
}) {
  const theme = useTheme()
  const { search } = useProto()
  const ThemeIcon = THEMES.find((t) => t.value === theme)?.icon ?? Monitor
  const next = THEMES[(THEMES.findIndex((t) => t.value === theme) + 1) % THEMES.length]!
  const tab = (active?: boolean) =>
    cn('flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent text-xs', active ? 'border-brand font-semibold' : 'text-muted-foreground')
  return (
    <div className="flex min-h-dvh flex-col max-lg:pb-14">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b px-3 md:px-4">
        <PLink to="/" aria-label="Faultline">
          <Wordmark />
        </PLink>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 min-w-0 items-center gap-1.5 px-1.5 text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent max-lg:h-9" aria-label="Organization">
            <span className="mono truncate">{org}</span>
            <ChevronsUpDown className="size-3 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-52">
            {orgMenu && (
              <>
                <DropdownMenuLabel className="mono tracking-normal normal-case">{org}</DropdownMenuLabel>
                {orgMenu.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <NavLink item={item}>{item.label}</NavLink>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel>Switch to</DropdownMenuLabel>
            {ORGS.filter((o) => o.slug !== org).map((o) => (
              <DropdownMenuItem key={o.slug} className="mono">
                {o.slug}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <PLink to="/organizations/new">New organization</PLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <nav className="ml-auto flex h-full items-stretch gap-4 max-lg:hidden" aria-label="Sections">
          {[...INERT, ...nav].map((item) => (
            <NavLink
              key={item.label}
              item={item}
              className={cn('flex items-center border-y-2 border-transparent text-sm font-medium', item.current ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 max-lg:ml-auto lg:border-l lg:pl-3">
          <Button size="sm" className="gap-1.5 px-2 max-lg:size-9 max-lg:px-0" aria-label="Commands">
            <Search className="size-3.5 max-lg:size-4" />
            <Kbd className="border-0 px-0 opacity-100">⌘K</Kbd>
          </Button>
          <Button variant="ghost" size="icon-sm" className="max-lg:hidden" aria-label="Theme" onClick={() => setTheme(next.value)}>
            <ThemeIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" className="max-lg:hidden" aria-label="Account">
            <span className="grid size-5 place-items-center bg-foreground text-xs font-semibold text-background uppercase">a</span>
          </Button>
        </div>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t bg-card lg:hidden" aria-label="Sections">
        {INERT.filter((item) => item.icon).map((item) => (
          <span key={item.label} className={tab()}>
            {item.icon && <item.icon className="size-5" strokeWidth={1.6} />}
            {item.label}
          </span>
        ))}
        <DropdownMenu defaultOpen={search.open === 'more'}>
          <DropdownMenuTrigger className={tab(more.some((item) => item.current))}>
            <Ellipsis className="size-5" strokeWidth={1.6} />
            More
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-60">
            {more.map((item) => (
              <DropdownMenuItem key={item.label} asChild>
                <NavLink item={item}>
                  {item.icon && <item.icon />}
                  {item.label}
                </NavLink>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme(next.value)}>
              <next.icon />
              {next.label} theme
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  )
}

/* ---------- the floating switcher: not part of any design ---------- */

export function Switcher() {
  const { variant, role, path, search } = useProto()
  const navigate = useNavigate()
  const keys = Object.values(Variant)
  const set = (patch: Partial<ProtoSearch>) =>
    void navigate({ to: '/prototype/settings/$', params: { _splat: path }, search: (prev) => ({ ...(prev as ProtoSearch), ...patch }), replace: true })
  const step = (by: number) => set({ variant: keys[(keys.indexOf(variant) + by + keys.length) % keys.length]! })
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = step
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable], [role="dialog"], [role="menu"]')) return
      if (event.key === 'ArrowLeft') stepRef.current(-1)
      if (event.key === 'ArrowRight') stepRef.current(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  if (import.meta.env.PROD || search.bar === 0) return null
  const pill = 'grid size-8 place-items-center hover:bg-white/15'
  return (
    <div className="fixed bottom-3 left-1/2 z-[70] flex -translate-x-1/2 items-center rounded-full bg-[#1d2bd6] px-1 py-1 font-mono text-xs text-white shadow-[0_8px_24px_-6px_rgb(0_0_0/0.6)] max-lg:bottom-16">
      <button type="button" className={cn(pill, 'rounded-full')} onClick={() => step(-1)} aria-label="Previous variant">
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-2 whitespace-nowrap">
        {variant.toUpperCase()} ({VARIANT_NAMES[variant]})
      </span>
      <button type="button" className={cn(pill, 'rounded-full')} onClick={() => step(1)} aria-label="Next variant">
        <ChevronRight className="size-4" />
      </button>
      <span className="mx-1 h-4 w-px bg-white/30" />
      <button
        type="button"
        className="h-8 rounded-full px-2.5 whitespace-nowrap hover:bg-white/15"
        onClick={() => set({ as: role === OrgRole.owner ? OrgRole.member : OrgRole.owner })}
        title="Switch between an owner's and a member's permissions"
      >
        as {role}
      </button>
    </div>
  )
}

/* ---------- small parts ---------- */

export function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </label>
  )
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn('h-9 w-full min-w-0 border bg-card px-2 text-base outline-none focus-visible:border-brand focus-visible:outline-none max-lg:h-11 max-lg:text-[1rem]', className)}
      {...props}
    />
  )
}

// On or off, square like everything else. The state is a word as well as a position.
export function Switch({ checked, onChange, label, on = 'On', off = 'Off' }: { checked: boolean; onChange: (next: boolean) => void; label: string; on?: string; off?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="group flex h-8 items-center gap-2 max-lg:h-11">
      <span className="w-12 text-right text-sm text-muted-foreground">{checked ? on : off}</span>
      <span className={cn('flex h-5 w-9 items-center border p-0.5 transition-colors duration-100', checked ? 'border-foreground bg-foreground' : 'border-foreground/45 bg-card')}>
        <span className={cn('size-3.5 transition-transform duration-100', checked ? 'translate-x-4 bg-background' : 'bg-foreground/55')} />
      </span>
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label, className }: { value: T; options: { value: T; label: string }[]; onChange: (next: T) => void; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex border', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 flex-1 border-r px-3 text-sm font-medium last:border-r-0 max-lg:h-11',
            option.value === value ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return { copied, copy }
}

export function CopyButton({ text, label = 'Copy', size = 'sm', className }: { text: string; label?: string; size?: 'sm' | 'default'; className?: string }) {
  const { copied, copy } = useCopy(text)
  return (
    <Button size={size} className={cn('max-lg:h-11', className)} onClick={copy}>
      {copied ? <Check className="text-ok" /> : <Copy />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

// A box of machine text that scrolls sideways. While there is more to the right, its right edge is drawn cut off.
function useCutOff() {
  const ref = useRef<HTMLPreElement>(null)
  const [cut, setCut] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setCut(element.scrollWidth - element.clientWidth - element.scrollLeft > 1)
    measure()
    element.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      element.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [])
  return { ref, cut }
}

const CUT_EDGE = 'pointer-events-none absolute inset-y-0 right-0 w-3 border-r-2 border-dashed border-foreground/60 bg-code/70'

// `wrap` breaks long lines instead of scrolling, for snippets whose one long line is the DSN.
export function CodeBlock({ code, label, copyLabel, wrap, className }: { code: string; label?: string; copyLabel?: string; wrap?: boolean; className?: string }) {
  const { ref, cut } = useCutOff()
  return (
    <div className={cn('border bg-code', className)}>
      <div className="flex h-9 items-center justify-between border-b pr-1 pl-3 max-lg:h-11">
        <span className="mono truncate text-muted-foreground">{label}</span>
        <CopyLink text={code} label={copyLabel} />
      </div>
      <div className="relative">
        <pre ref={ref} className={cn('mono py-3 pl-3 leading-[1.6]', wrap ? 'pr-3 whitespace-pre-wrap [overflow-wrap:anywhere]' : 'overflow-x-auto')}>
          {code}
        </pre>
        {cut && <span className={CUT_EDGE} aria-hidden />}
      </div>
    </div>
  )
}

function CopyLink({ text, label = 'Copy' }: { text: string; label?: string }) {
  const { copied, copy } = useCopy(text)
  return (
    <button type="button" onClick={copy} className="flex h-7 items-center gap-1.5 px-2 text-sm font-medium hover:bg-accent max-lg:h-9">
      {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

// One line of machine text (a DSN, an invite link) with its copy button.
export function CopyField({ value, label, className }: { value: string; label: string; className?: string }) {
  const { ref, cut } = useCutOff()
  return (
    <div className={cn('flex items-stretch border bg-code', className)}>
      <div className="relative min-w-0 flex-1">
        <pre ref={ref} aria-label={label} className="mono flex h-9 items-center overflow-x-auto pl-2.5 whitespace-nowrap [scrollbar-width:none] max-lg:h-11">
          {value}
        </pre>
        {cut && <span className={CUT_EDGE} aria-hidden />}
      </div>
      <div className="flex items-center border-l bg-card">
        <CopyLink text={value} />
      </div>
    </div>
  )
}

export function Initials({ member, className }: { member: Pick<Member, 'email' | 'user'>; className?: string }) {
  const text = (member.user?.name || member.email)
    .split(/[\s@._-]+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
  return (
    <span className={cn('grid size-6 shrink-0 place-items-center font-mono text-[0.6875rem] font-semibold uppercase', member.user ? 'bg-foreground text-background' : 'border border-dashed border-foreground/50 text-muted-foreground', className)}>
      {text}
    </span>
  )
}

export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn('mono border px-1.5 py-px text-xs whitespace-nowrap text-muted-foreground', className)}>{children}</span>
}

export function TeamTag({ slug }: { slug: string }) {
  return <span className="mono whitespace-nowrap text-muted-foreground">#{slug}</span>
}

/* ---------- dialogs ---------- */

export function Modal({
  open,
  onClose,
  title,
  footer,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  footer?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} className={cn('flex max-h-[80dvh] flex-col max-lg:top-[6vh]', className)}>
        <div className="flex h-11 shrink-0 items-center border-b px-4">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">{children}</div>
        <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3">
          {footer ?? (
            <DialogClose asChild>
              <Button className="max-lg:h-11">Close</Button>
            </DialogClose>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Deleting something with data behind it: the name has to be typed.
export function DeleteDialog({ open, onClose, what, name, loses }: { open: boolean; onClose: () => void; what: string; name: string; loses: string }) {
  const [typed, setTyped] = useState('')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Delete ${what} ${name}`}
      footer={
        <>
          <Button className="max-lg:h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" className="max-lg:h-11" disabled={typed !== name} onClick={onClose}>
            Delete {what}
          </Button>
        </>
      }
    >
      <p className="prose-text">{loses}</p>
      <Field label={`Type ${name} to delete it`}>
        <Input value={typed} onChange={(event) => setTyped(event.target.value)} className="font-mono" autoComplete="off" />
      </Field>
    </Modal>
  )
}

export function TeamChecks({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Teams">
      {TEAMS.map((team) => {
        const on = value.includes(team.slug)
        return (
          <button
            key={team.slug}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((slug) => slug !== team.slug) : [...value, team.slug])}
            className={cn('mono flex h-8 items-center gap-1.5 border px-2.5 max-lg:h-11', on ? 'border-foreground bg-selected' : 'bg-card text-muted-foreground hover:bg-accent')}
          >
            {on && <Check className="size-3.5" />}#{team.slug}
          </button>
        )
      })}
    </div>
  )
}

export function RolePicker({ value, onChange, allowOwner }: { value: OrgRole; onChange: (next: OrgRole) => void; allowOwner: boolean }) {
  const options = ROLES.filter((role) => allowOwner || role.value !== OrgRole.owner)
  return (
    <div className="flex flex-col gap-1.5">
      <Segmented value={value} options={options} onChange={onChange} label="Role" />
      <span className="text-sm text-muted-foreground">{ROLES.find((role) => role.value === value)?.can}</span>
    </div>
  )
}

// The short task every variant shares. With email off on the server, the result is a link to pass on by hand.
export function InviteDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited?: (emails: string[], role: OrgRole, teams: string[]) => void }) {
  const { role: myRole, search } = useProto()
  const emailOff = search.email === 'off'
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<OrgRole>(OrgRole.member)
  const [teams, setTeams] = useState<string[]>([])
  const [sent, setSent] = useState<string[] | null>(search.open === 'invited' ? ['nana.adjei@example.com', 'efua.sarpong@example.com'] : null)
  const list = emails
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean)
  const close = () => {
    onClose()
    setSent(null)
    setEmails('')
  }
  const submit = () => {
    onInvited?.(list, role, teams)
    if (emailOff) setSent(list)
    else close()
  }
  if (sent)
    return (
      <Modal
        open={open}
        onClose={close}
        title={sent.length === 1 ? 'Invite link' : `${sent.length} invite links`}
        footer={
          <Button variant="default" className="max-lg:h-11" onClick={close}>
            Done
          </Button>
        }
      >
        <p className="prose-text">This server doesn't send email. Pass each link on yourself; it works for 15 days.</p>
        {sent.map((email, index) => (
          <div key={email} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{email}</span>
            <CopyField value={inviteLink(String(20 + index))} label={`Invite link for ${email}`} />
          </div>
        ))}
      </Modal>
    )
  return (
    <Modal
      open={open}
      onClose={close}
      title="Invite members"
      footer={
        <>
          <Button className="max-lg:h-11" onClick={close}>
            Cancel
          </Button>
          <Button variant="default" className="max-lg:h-11" disabled={list.length === 0} onClick={submit}>
            {emailOff ? (list.length > 1 ? `Create ${list.length} invite links` : 'Create invite link') : list.length > 1 ? `Send ${list.length} invites` : 'Send invite'}
          </Button>
        </>
      }
    >
      <Field label="Email addresses">
        <Input autoFocus value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="ada@example.com, kwame@example.com" inputMode="email" autoComplete="off" />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Role</span>
        <RolePicker value={role} onChange={setRole} allowOwner={myRole === OrgRole.owner} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Teams</span>
        <TeamChecks value={teams} onChange={setTeams} />
      </div>
    </Modal>
  )
}

export { roleLabel }
