// THROWAWAY PROTOTYPE. Variant D, the picker's mix: B's ledger (one settings index, rows that unfold, search) with
// A's install step after creating a project and C's organisation menu as the desktop shortcut.
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Plug, Plus, ScrollText, Search, Settings } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ago } from '@/features/issues/format'
import { LevelGlyph, Trace } from '@/features/issues/parts'
import { cn } from '@/lib/utils'
import { ALERT_COUNT, ENVIRONMENTS, HOME, INSTANCE, KEYS, MEMBERS, NOW, ORG, OrgRole, PROJECTS, ROLES, TEAMS, inviteLink, type Member, type ProjectRow, type Team } from './data'
import { CopyField, DeleteDialog, Field, Initials, Modal, PLink, ProtoShell, Segmented, Select, Switch, Tag, roleLabel, useCopy, useGo, useProto } from './kit'
import { AxisLabel, KeyDialog, Snippets, rateLimitText } from './parts'
import { DSN_PLACEHOLDER, PLATFORMS, platformName, platformOf } from './platforms'
import { NewOrganization, SignInApps, SystemInfo, type Screen } from './screens'

// Who is looking: the owner, or (with "as member") an ordinary member.
function useMe() {
  const { role } = useProto()
  return MEMBERS.find((member) => member.role === role && !member.pending) ?? MEMBERS[0]!
}

// Stub: only web-app has a second, rate-limited key.
const keysOf = (slug: string | null | undefined) => (slug === 'web-app' ? KEYS : KEYS.slice(0, 1))

export function VariantD({ screen }: { screen: Screen }) {
  const org = 'org' in screen ? screen.org : ORG.slug
  const outside = screen.kind === 'home' || screen.kind === 'orgProjects' || screen.kind === 'newOrg'
  const base = `/${org}/settings`
  const settings = { label: 'Settings', to: base, current: !outside, icon: Settings }
  return (
    <ProtoShell
      org={org}
      nav={[settings]}
      orgMenu={[
        { label: 'Members', to: `${base}/members` },
        { label: 'Teams', to: `${base}/teams` },
        { label: 'Settings', to: base },
      ]}
      more={[{ label: 'Logs', icon: ScrollText }, settings]}
    >
      {screen.kind === 'home' || screen.kind === 'orgProjects' ? (
        <Home org={screen.kind === 'orgProjects' ? screen.org : undefined} />
      ) : screen.kind === 'newOrg' ? (
        <div className="flex flex-1 justify-center px-3 py-10 md:px-4">
          <NewOrganization />
        </div>
      ) : screen.kind === 'org' ? (
        <Index org={org} />
      ) : screen.kind === 'project' ? (
        <ProjectLedger org={org} slug={screen.slug} />
      ) : screen.kind === 'members' || screen.kind === 'invite' || screen.kind === 'member' ? (
        <Members org={org} inviting={screen.kind === 'invite'} openId={screen.kind === 'member' ? screen.id : undefined} />
      ) : screen.kind === 'teams' || screen.kind === 'team' ? (
        <Teams org={org} openSlug={screen.kind === 'team' ? screen.team : undefined} />
      ) : screen.kind === 'newProject' ? (
        <NewProject org={org} />
      ) : (
        <>
          <Bar back={base} title={screen.kind === 'signIn' ? 'Sign-in apps' : 'System info'} />
          <Sheet>{screen.kind === 'signIn' ? <SignInApps /> : <SystemInfo />}</Sheet>
        </>
      )}
    </ProtoShell>
  )
}

/* ---------- the ledger ---------- */

function Bar({ back, title, mono, children }: { back?: string; title: string; mono?: boolean; children?: ReactNode }) {
  return (
    <PageBar>
      {back && (
        <PLink to={back} className="-ml-2 flex h-11 items-center gap-1 pr-1 pl-1 text-sm font-medium text-muted-foreground hover:text-foreground" aria-label="Back to settings">
          <ChevronLeft className="size-4" />
          <span className="max-lg:hidden">Settings</span>
        </PLink>
      )}
      <span className={cn('truncate font-semibold', mono && 'font-mono')}>{title}</span>
      <span className="ml-auto flex min-w-0 items-center gap-2">{children}</span>
    </PageBar>
  )
}

function Sheet({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-4xl flex-1 lg:border-x', className)}>{children}</div>
}

function Head({ id, label, children }: { id?: string; label: string; children?: ReactNode }) {
  return (
    <div id={id} className="flex h-9 scroll-mt-[5.25rem] items-center justify-between border-b bg-muted pr-2 pl-3 md:pl-4 lg:h-8">
      <h2 className="label-caps">{label}</h2>
      {children}
    </div>
  )
}

const ROW = 'flex min-h-12 w-full items-center gap-3 border-b px-3 text-left md:px-4 lg:min-h-11'

function Row({
  label,
  value,
  mono,
  to,
  search,
  action,
  open,
  onToggle,
  children,
}: {
  label: ReactNode
  value?: ReactNode
  mono?: boolean
  to?: string
  search?: { tab?: string }
  action?: ReactNode
  open?: boolean
  onToggle?: () => void
  children?: ReactNode
}) {
  const body = (
    <>
      <span className="w-32 shrink-0 font-medium lg:w-52">{label}</span>
      <span className={cn('min-w-0 flex-1 truncate text-muted-foreground', mono && 'mono')}>{value}</span>
      {action}
      {to && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      {onToggle && <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />}
    </>
  )
  if (to)
    return (
      <PLink to={to} search={search} className={cn(ROW, 'hover:bg-accent')}>
        {body}
      </PLink>
    )
  if (!onToggle) return <div className={ROW}>{body}</div>
  return (
    <div className={cn(open && 'bg-card')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={cn(ROW, 'hover:bg-accent', open && 'border-b-0')}>
        {body}
      </button>
      {open && <div className="flex flex-col gap-3 border-b px-3 pb-4 md:px-4 lg:pl-[14rem]">{children}</div>}
    </div>
  )
}

function SaveCancel({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex gap-2">
      <Button variant="default" className="max-lg:h-11" onClick={onDone}>
        Save
      </Button>
      <Button className="max-lg:h-11" onClick={onDone}>
        Cancel
      </Button>
    </div>
  )
}

function useOpen(initial: string | null = null) {
  const [open, setOpen] = useState<string | null>(initial)
  return { toggle: (id: string) => setOpen(open === id ? null : id), close: () => setOpen(null), is: (id: string) => open === id }
}

/* ---------- settings index and search ---------- */

type Entry = { path: string[]; value: string; words?: string; to: string; tab?: string }

function entries(org: string): Entry[] {
  const base = `/${org}/settings`
  return [
    { path: [ORG.slug, 'Name'], value: ORG.name, to: base },
    { path: [ORG.slug, 'Sign-in apps'], value: 'None', to: `${base}/sign-in` },
    { path: [ORG.slug, 'Delete organization'], value: '', to: base },
    ...MEMBERS.map((member) => ({ path: ['Members', member.user?.name || member.email], value: `${member.email} · ${roleLabel(member.role)}`, to: `${base}/members/${member.id}` })),
    { path: ['Members', 'Invite members'], value: '', to: `${base}/members/new` },
    ...TEAMS.map((team) => ({ path: ['Teams', `#${team.slug}`], value: `${team.memberCount} members`, to: `${base}/teams/${team.slug}/members` })),
    ...PROJECTS.flatMap((project) => {
      const to = `${base}/projects/${project.slug}`
      const at = (name: string, value: string, tab?: string, words?: string): Entry => ({ path: [project.slug ?? '', ...name.split(' › ')], value, to, tab, words })
      return [
        at('Name', project.name),
        at('Platform', platformName(project.platform)),
        at('Teams with access', project.teams.map((team) => `#${team.slug}`).join(' ')),
        at('Events to drop', `${project.eventThrottleRate}%`),
        // One entry per key, named, with its own limit; the DSN is searchable but not shown.
        ...keysOf(project.slug).map((key) => at(`Client keys › ${key.name}`, rateLimitText(key), 'dsn', `dsn rate limit ${key.dsn.public}`)),
        ...ENVIRONMENTS.map((environment) => at(`Environments › ${environment.name}`, environment.isHidden ? 'Hidden' : 'Shown', 'environments')),
        at('Alerts', `${ALERT_COUNT}`, 'alerts'),
        at('Delete project', ''),
      ]
    }),
    { path: ['Server', 'System info'], value: INSTANCE.version, to: '/system-info' },
  ]
}

function Index({ org }: { org: string }) {
  const { can, search } = useProto()
  const go = useGo()
  const [query, setQuery] = useState(search.q ?? '')
  const row = useOpen()
  const [deleting, setDeleting] = useState(false)
  const base = `/${org}/settings`
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const found = words.length ? entries(org).filter((entry) => words.every((word) => `${entry.path.join(' ')} ${entry.value} ${entry.words ?? ''}`.toLowerCase().includes(word))) : []
  const invited = MEMBERS.filter((member) => member.pending).length
  return (
    <>
      <PageBar>
        <span className="font-semibold max-lg:hidden">Settings</span>
        <div className="relative w-full lg:ml-3 lg:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && found[0] && go(found[0].to, found[0].tab ? { tab: found[0].tab } : undefined)}
            placeholder="Find a setting, project or person"
            aria-label="Find a setting, project or person"
            className="h-8 pl-8 max-lg:h-9"
          />
          <Kbd className="absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
        </div>
      </PageBar>
      <Sheet>
        {words.length > 0 ? (
          <ul>
            {found.map((entry, index) => (
              <li key={entry.to + entry.path.join('/')}>
                <PLink to={entry.to} search={entry.tab ? { tab: entry.tab } : undefined} className={cn(ROW, 'hover:bg-accent', index === 0 && 'bg-selected')}>
                  <span className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-center lg:gap-3">
                    <span className="truncate">
                      {entry.path.slice(0, -1).map((part) => (
                        <span key={part} className="text-muted-foreground">
                          {part} ›{' '}
                        </span>
                      ))}
                      <span className="font-medium">{entry.path.at(-1)}</span>
                    </span>
                    <span className="mono min-w-0 truncate text-muted-foreground lg:ml-auto lg:max-w-[45%]">{entry.value}</span>
                  </span>
                  {index === 0 && <Kbd>↵</Kbd>}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </PLink>
              </li>
            ))}
            {found.length === 0 && <li className="px-3 py-10 text-center text-muted-foreground md:px-4">Nothing in settings matches “{query}”.</li>}
          </ul>
        ) : (
          <>
            <Head label={ORG.slug} />
            <Row label="Name" value={ORG.name} open={row.is('name')} onToggle={can('org:write') ? () => row.toggle('name') : undefined}>
              <Input defaultValue={ORG.name} aria-label="Name" maxLength={200} autoFocus className="max-w-sm" />
              <SaveCancel onDone={row.close} />
            </Row>
            <Row label="Joining teams" value={ORG.openMembership ? 'Anyone in the organization' : 'By invitation'} />
            <Row label="Sign-in apps" value="None" to={`${base}/sign-in`} />
            {can('org:admin') && (
              <Row
                label="Delete organization"
                action={
                  <Button variant="destructive" size="sm" className="max-lg:h-9" onClick={() => setDeleting(true)}>
                    Delete
                  </Button>
                }
              />
            )}

            <Head label="People">
              {can('member:write') && (
                <Button asChild size="sm" variant="ghost" className="max-lg:h-9">
                  <PLink to={`${base}/members/new`}>
                    <Plus />
                    Invite members
                  </PLink>
                </Button>
              )}
            </Head>
            <Row label="Members" value={`${MEMBERS.length - invited} members · ${invited} invited`} to={`${base}/members`} />
            <Row label="Teams" mono value={TEAMS.map((team) => `#${team.slug}`).join('  ')} to={`${base}/teams`} />

            <Head label="Projects">
              {can('project:write') && (
                <Button asChild size="sm" variant="ghost" className="max-lg:h-9">
                  <PLink to={`${base}/projects/new`}>
                    <Plus />
                    New project
                  </PLink>
                </Button>
              )}
            </Head>
            {PROJECTS.map((project) => (
              <Row
                key={project.id}
                label={<span className="mono">{project.slug}</span>}
                value={
                  <>
                    {platformName(project.platform)}
                    <span className="max-lg:hidden">
                      {' · '}
                      <span className="mono">{project.teams.map((team) => `#${team.slug}`).join(' ')}</span>
                    </span>
                    {!project.firstEvent && ' · no events yet'}
                  </>
                }
                to={`${base}/projects/${project.slug}`}
              />
            ))}

            <Head label="Server" />
            <Row label="System info" mono value={INSTANCE.version} to="/system-info" />
          </>
        )}
      </Sheet>
      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} what="organization" name={ORG.slug} loses={`${PROJECTS.length} projects, their issues and ${MEMBERS.length} memberships are deleted for good.`} />
    </>
  )
}

/* ---------- project: one page of rows, with jump links that follow the scroll ---------- */

// Bars above a section's heading: page bar (44) and the jump links (40), plus a little slack.
const SPY_OFFSET = 96

// Which section is on screen. Jumping sets it at once, so a page too short to scroll still marks the choice.
function useSection(ids: string[], initial: string | undefined) {
  const [current, setCurrent] = useState(initial && ids.includes(initial) ? initial : ids[0]!)
  const jumping = useRef(false)
  const jump = (id: string) => {
    jumping.current = true
    setCurrent(id)
    document.getElementById(id)?.scrollIntoView()
    setTimeout(() => (jumping.current = false), 100)
  }
  useEffect(() => {
    // After the router has put the new page at the top.
    const landing = initial && initial !== ids[0] ? setTimeout(() => jump(initial), 60) : undefined
    const onScroll = () => {
      if (jumping.current) return
      const passed = ids.filter((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= SPY_OFFSET)
      setCurrent(passed.at(-1) ?? ids[0]!)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(landing)
      window.removeEventListener('scroll', onScroll)
    }
    // The sections of a page do not change while it is open.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { current, jump }
}

function ProjectLedger({ org, slug }: { org: string; slug: string }) {
  const { can, search } = useProto()
  const project = PROJECTS.find((p) => p.slug === slug) ?? PROJECTS[0]!
  const keys = keysOf(slug)
  const fresh = !project.firstEvent
  // ?open=key edits the last key, and that is the row left open behind the dialog.
  const editedFirst = search.open === 'key' ? keys.at(-1)!.id : null
  const row = useOpen(editedFirst ? `key:${editedFirst}` : search.tab === 'dsn' ? `key:${keys[0]!.id}` : null)
  const [teams, setTeams] = useState(project.teams.map((team) => team.slug))
  const [hidden, setHidden] = useState(() => new Set(ENVIRONMENTS.filter((e) => e.isHidden).map((e) => e.name)))
  const [editing, setEditing] = useState<string | null>(editedFirst)
  const [deleting, setDeleting] = useState(false)
  const write = can('project:write')
  const edit = (id: string) => (write ? () => row.toggle(id) : undefined)
  const sections = [
    { id: 'general', label: 'General' },
    { id: 'dsn', label: 'Client keys', count: keys.length },
    ...(fresh ? [] : [{ id: 'environments', label: 'Environments', count: ENVIRONMENTS.length }]),
    ...(fresh ? [] : [{ id: 'alerts', label: 'Alerts', count: ALERT_COUNT }]),
  ]
  const { current, jump } = useSection(
    sections.map((section) => section.id),
    search.tab,
  )
  return (
    <>
      <Bar back={`/${org}/settings`} title={slug} mono>
        <Button asChild size="sm" className="max-lg:h-9">
          <PLink to={`/${org}/projects`}>Issues</PLink>
        </Button>
      </Bar>
      <Sheet className="pb-[55vh]">
        <nav aria-label="Sections" className="sticky top-11 z-10 flex h-10 gap-5 overflow-x-auto border-b bg-background px-3 md:px-4">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              aria-current={current === section.id ? 'true' : undefined}
              onClick={() => jump(section.id)}
              className={cn('flex h-full items-center gap-1.5 border-y-2 border-transparent text-sm font-medium whitespace-nowrap', current === section.id ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}
            >
              {section.label}
              {section.count !== undefined && <span className="mono text-muted-foreground">{section.count}</span>}
            </button>
          ))}
        </nav>
        {fresh && (
          <div className="border-b p-3 md:p-4">
            <Install slug={slug} platformId={project.platform ?? 'other'} arrived={search.open === 'arrived'} />
          </div>
        )}
        <Head id="general" label="General" />
        <Row label="Name" value={project.name} open={row.is('name')} onToggle={edit('name')}>
          <Input defaultValue={project.name} aria-label="Name" maxLength={64} autoFocus className="max-w-sm" />
          <SaveCancel onDone={row.close} />
        </Row>
        <Row label="Platform" value={platformName(project.platform)} open={row.is('platform')} onToggle={edit('platform')}>
          <Select defaultValue={project.platform ?? 'other'} aria-label="Platform" className="max-w-sm">
            {PLATFORMS.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </Select>
          <SaveCancel onDone={row.close} />
        </Row>
        <Row label="Teams with access" mono value={teams.map((team) => `#${team}`).join('  ')} open={row.is('teams')} onToggle={edit('teams')}>
          <TeamList value={teams} onChange={setTeams} className="max-w-sm" />
          <SaveCancel onDone={row.close} />
        </Row>
        <Row label="Events to drop" mono value={`${project.eventThrottleRate}%`} open={row.is('throttle')} onToggle={edit('throttle')}>
          <Field label="Percent" className="max-w-32">
            <Input defaultValue={project.eventThrottleRate} inputMode="numeric" className="font-mono" autoFocus />
          </Field>
          <SaveCancel onDone={row.close} />
        </Row>
        <Row label="IP addresses" value={project.scrubIPAddresses ? 'Not stored' : 'Stored'} />

        <Head id="dsn" label="Client keys">
          {write && (
            <Button size="sm" variant="ghost" className="max-lg:h-9" onClick={() => setEditing('new')}>
              <Plus />
              New key
            </Button>
          )}
        </Head>
        {keys.map((key) => (
          <Row
            key={key.id}
            label={key.name}
            mono
            value={row.is(`key:${key.id}`) ? rateLimitText(key) : key.dsn.public}
            open={row.is(`key:${key.id}`)}
            onToggle={() => row.toggle(`key:${key.id}`)}
            action={!row.is(`key:${key.id}`) && <span className="mono text-muted-foreground max-lg:hidden">{rateLimitText(key)}</span>}
          >
            <Field label="DSN">
              <CopyField value={key.dsn.public!} label={`DSN for ${key.name}`} />
            </Field>
            <Field label="Security report address">
              <CopyField value={key.dsn.security!} label="Security report address" />
            </Field>
            {write && (
              <div className="flex gap-2">
                <Button className="max-lg:h-11" onClick={() => setEditing(key.id)}>
                  Rename or limit
                </Button>
                <Button variant="destructive" className="max-lg:h-11">
                  Delete key
                </Button>
              </div>
            )}
          </Row>
        ))}

        {!fresh && (
          <>
            <Head id="environments" label="Environments" />
            {ENVIRONMENTS.map((environment) => (
              <Row
                key={environment.name}
                label={<span className={cn('mono font-normal', hidden.has(environment.name) && 'text-muted-foreground line-through')}>{environment.name}</span>}
                action={
                  write ? (
                    <Switch
                      label={`Show ${environment.name}`}
                      on="Shown"
                      off="Hidden"
                      checked={!hidden.has(environment.name)}
                      onChange={(shown) => {
                        const next = new Set(hidden)
                        if (shown) next.delete(environment.name)
                        else next.add(environment.name)
                        setHidden(next)
                      }}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">{hidden.has(environment.name) ? 'Hidden' : 'Shown'}</span>
                  )
                }
              />
            ))}

            <Head id="alerts" label="Alerts">
              {write && (
                <Button size="sm" variant="ghost" className="max-lg:h-9">
                  <Plus />
                  New alert
                </Button>
              )}
            </Head>
            <Row label="Error burst" value="10 events in 1 minute · email, Slack" open={false} onToggle={write ? () => {} : undefined} />
            <Row label="Uptime" value="A check fails · email" open={false} onToggle={write ? () => {} : undefined} />
          </>
        )}

        {can('project:admin') && (
          <>
            <Head label="Danger" />
            <Row
              label="Delete project"
              action={
                <Button variant="destructive" size="sm" className="max-lg:h-9" onClick={() => setDeleting(true)}>
                  Delete
                </Button>
              }
            />
          </>
        )}
      </Sheet>
      {editing && <KeyDialog open onClose={() => setEditing(null)} keyItem={keys.find((key) => key.id === editing)} />}
      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} what="project" name={slug} loses="Its issues, events, client keys and alerts are deleted for good." />
    </>
  )
}

/* ---------- people ---------- */

// What each role adds to the one before it. Shown on demand, beside the role control.
const ROLE_ADDS: Record<OrgRole, string> = {
  member: 'Works on issues in the projects of their teams: resolve, ignore, assign, comment.',
  admin: 'Also changes the projects and teams they are on: settings, client keys, alerts, team members.',
  manager: 'Also invites and removes members, and changes every team and project.',
  owner: 'Also renames or deletes the organization, and can hand ownership to someone else.',
}

function RoleField({ value, onChange, allowOwner }: { value: OrgRole; onChange: (next: OrgRole) => void; allowOwner: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Role</span>
        <Popover>
          <PopoverTrigger className="text-sm font-medium text-brand underline-offset-4 hover:underline max-lg:flex max-lg:h-11 max-lg:items-center">Compare roles</PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <dl>
              {ROLES.map((role) => (
                <div key={role.value} className={cn('flex flex-col gap-0.5 border-b px-3 py-2.5 last:border-b-0', role.value === value && 'bg-selected')}>
                  <dt className="text-sm font-semibold">{role.label}</dt>
                  <dd className="text-sm text-muted-foreground">{ROLE_ADDS[role.value]}</dd>
                </div>
              ))}
            </dl>
          </PopoverContent>
        </Popover>
      </div>
      <Segmented value={value} options={ROLES.filter((role) => allowOwner || role.value !== OrgRole.owner)} onChange={onChange} label="Role" />
    </div>
  )
}

// Teams as a checklist: every row reads as a choice, picked or not.
function TeamList({ value, onChange, className }: { value: string[]; onChange: (next: string[]) => void; className?: string }) {
  return (
    <div role="group" aria-label="Teams" className={cn('border bg-card', className)}>
      {TEAMS.map((team) => {
        const on = value.includes(team.slug)
        return (
          <label key={team.slug} className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b px-2.5 last:border-b-0 hover:bg-accent max-lg:min-h-11">
            <Checkbox checked={on} onCheckedChange={(next) => onChange(next ? [...value, team.slug] : value.filter((slug) => slug !== team.slug))} />
            <span className="mono shrink-0">#{team.slug}</span>
            <span className="flex-1" />
            <span className="mono text-muted-foreground">
              {PROJECTS.filter((project) => project.teams.some((t) => t.slug === team.slug))
                .map((project) => project.slug)
                .join(' ')}
            </span>
          </label>
        )
      })}
    </div>
  )
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role: myRole, search } = useProto()
  const emailOff = search.email === 'off'
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<OrgRole>(OrgRole.member)
  const [teams, setTeams] = useState<string[]>([])
  const [links, setLinks] = useState<string[] | null>(search.open === 'invited' ? ['nana.adjei@example.com', 'efua.sarpong@example.com'] : null)
  const list = emails.split(/[\s,;]+/).filter(Boolean)
  const close = () => {
    onClose()
    setLinks(null)
    setEmails('')
  }
  // With email off the links are the only delivery, so they are the result. With email on, the new rows are.
  if (links)
    return (
      <Modal
        open={open}
        onClose={close}
        title={links.length === 1 ? 'Invite link' : `${links.length} invite links`}
        footer={
          <Button variant="default" className="max-lg:h-11" onClick={close}>
            Done
          </Button>
        }
      >
        <p className="prose-text">This server doesn't send email. Pass each link on yourself; it works for 15 days.</p>
        {links.map((email, index) => (
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
          <Button variant="default" className="max-lg:h-11" disabled={list.length === 0} onClick={() => (emailOff ? setLinks(list) : close())}>
            {emailOff ? (list.length > 1 ? `Create ${list.length} invite links` : 'Create invite link') : list.length > 1 ? `Send ${list.length} invites` : 'Send invite'}
          </Button>
        </>
      }
    >
      <Field label="Email addresses">
        <Input autoFocus value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="ada@example.com, kwame@example.com" inputMode="email" autoComplete="off" />
      </Field>
      <RoleField value={role} onChange={setRole} allowOwner={myRole === OrgRole.owner} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Teams</span>
        <TeamList value={teams} onChange={setTeams} />
      </div>
    </Modal>
  )
}

// The list never carries the link, so the button asks for it again (a re-invite that sends no email) and copies it.
function CopyInviteLink({ member }: { member: Member }) {
  const { copied, copy } = useCopy(inviteLink(member.id))
  return (
    <Button className="max-lg:h-11" onClick={copy}>
      {copied ? <Check className="text-ok" /> : <Copy />}
      {copied ? 'Link copied' : 'Copy invite link'}
    </Button>
  )
}

function Members({ org, inviting, openId }: { org: string; inviting: boolean; openId?: string }) {
  const { can } = useProto()
  const go = useGo()
  const base = `/${org}/settings/members`
  const [query, setQuery] = useState('')
  const shown = MEMBERS.filter((member) => `${member.user?.name ?? ''} ${member.email}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <Bar back={`/${org}/settings`} title="Members">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a member" aria-label="Find a member" className="h-8 w-56 max-lg:hidden" />
        {can('member:write') && (
          <Button variant="default" size="sm" className="max-lg:h-9" onClick={() => go(`${base}/new`)}>
            <Plus />
            Invite members
          </Button>
        )}
      </Bar>
      <Sheet>
        <ul>
          {shown.map((member) => (
            <MemberRow key={member.id} member={member} open={member.id === openId} onToggle={() => go(member.id === openId ? base : `${base}/${member.id}`, undefined, true)} />
          ))}
        </ul>
      </Sheet>
      <InviteDialog open={inviting && can('member:write')} onClose={() => go(base, undefined, true)} />
    </>
  )
}

function MemberRow({ member, open, onToggle }: { member: Member; open: boolean; onToggle: () => void }) {
  const { can, role: myRole, search } = useProto()
  const me = useMe()
  const mine = member.id === me.id
  const [role, setRole] = useState(member.role)
  const [teams, setTeams] = useState(member.teams)
  const editable = can('member:write') && (member.role !== OrgRole.owner || myRole === OrgRole.owner)
  const summary = (
    <>
      <Initials member={member} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{member.user?.name || member.email}</span>
          {member.pending && <Tag>Invited</Tag>}
          {mine && <Tag>You</Tag>}
        </span>
        <span className="truncate text-sm text-muted-foreground">{member.user?.name ? member.email : `Invited ${ago(member.dateCreated, NOW)} ago`}</span>
      </span>
      <span className="mono w-40 truncate text-muted-foreground max-lg:hidden">{member.teams.map((team) => `#${team}`).join(' ')}</span>
      <span className="w-20 text-sm lg:w-24">{roleLabel(member.role)}</span>
    </>
  )
  // Someone who cannot change members sees a plain list: nothing unfolds. Their own row carries the one thing they can do.
  if (!editable)
    return (
      <li className="flex min-h-14 items-center gap-3 border-b px-3 md:px-4">
        {summary}
        <span className="flex w-16 justify-end">
          {mine && member.role !== OrgRole.owner && (
            <Button size="sm" className="max-lg:h-9">
              Leave
            </Button>
          )}
        </span>
      </li>
    )
  return (
    <li className={cn(open && 'bg-card')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={cn('flex min-h-14 w-full items-center gap-3 border-b px-3 text-left hover:bg-accent md:px-4', open && 'border-b-0')}>
        {summary}
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-b px-3 pb-4 md:px-4 lg:pl-[3.25rem]">
          <div className="grid max-w-2xl gap-4 lg:grid-cols-2">
            <RoleField value={role} onChange={setRole} allowOwner={myRole === OrgRole.owner} />
            <div className="flex flex-col gap-1.5">
              <span className="flex h-5 items-center text-sm font-medium">Teams</span>
              <TeamList value={teams} onChange={setTeams} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" className="max-lg:h-11" onClick={onToggle}>
              Save
            </Button>
            {member.pending && <CopyInviteLink member={member} />}
            {member.pending && search.email !== 'off' && <Button className="max-lg:h-11">Send invite again</Button>}
            {myRole === OrgRole.owner && !member.pending && !mine && <Button className="max-lg:h-11">Transfer ownership</Button>}
            {!mine && (
              <Button variant="destructive" className="max-lg:h-11 lg:ml-auto">
                {member.pending ? 'Cancel invite' : 'Remove'}
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

/* ---------- teams ---------- */

function Teams({ org, openSlug }: { org: string; openSlug?: string }) {
  const { can } = useProto()
  const go = useGo()
  const base = `/${org}/settings/teams`
  return (
    <>
      <Bar back={`/${org}/settings`} title="Teams">
        {can('team:write') && (
          <Button variant="default" size="sm" className="max-lg:h-9">
            <Plus />
            New team
          </Button>
        )}
      </Bar>
      <Sheet>
        <ul>
          {TEAMS.map((team) => (
            <TeamRow key={team.slug} org={org} team={team} open={team.slug === openSlug} onToggle={() => go(team.slug === openSlug ? base : `${base}/${team.slug}/members`, undefined, true)} />
          ))}
        </ul>
      </Sheet>
    </>
  )
}

function TeamRow({ org, team, open, onToggle }: { org: string; team: Team; open: boolean; onToggle: () => void }) {
  const { can } = useProto()
  const me = useMe()
  const members = MEMBERS.filter((member) => member.teams.includes(team.slug))
  const projects = PROJECTS.filter((project) => project.teams.some((t) => t.slug === team.slug))
  const write = can('team:write')
  const joined = me.teams.includes(team.slug)
  const line = 'flex min-h-10 items-center gap-2.5 border-b last:border-b-0 max-lg:min-h-11'
  return (
    <li className={cn(open && 'bg-card')}>
      <div className={cn('relative flex min-h-14 items-center gap-3 border-b px-3 hover:bg-accent md:px-4', open && 'border-b-0')}>
        <button type="button" aria-expanded={open} onClick={onToggle} className="absolute inset-0" aria-label={`Team ${team.slug}`} />
        <span className="mono w-32 truncate font-medium lg:w-52">#{team.slug}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          <span className="mono">{members.length}</span> members · <span className="mono">{projects.length}</span> projects
        </span>
        {(joined || ORG.openMembership || can('org:write')) && (
          <Button size="sm" className="relative z-10 w-16 max-lg:h-9">
            {joined ? 'Leave' : 'Join'}
          </Button>
        )}
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </div>
      {open && (
        <div className="grid gap-x-8 gap-y-4 border-b px-3 pb-4 md:px-4 lg:grid-cols-2">
          <section>
            <h3 className="label-caps border-b pb-1.5">Members</h3>
            {members.map((member) => (
              <div key={member.id} className={line}>
                <Initials member={member} className="size-5 text-[0.625rem]" />
                <PLink to={`/${org}/settings/members/${member.id}`} className="min-w-0 flex-1 truncate hover:underline">
                  {member.user?.name || member.email}
                </PLink>
                {member.id === me.id ? (
                  <Button size="sm" variant="ghost" className="max-lg:h-11">
                    Leave
                  </Button>
                ) : (
                  write && (
                    <Button size="sm" variant="ghost" className="max-lg:h-11">
                      Remove
                    </Button>
                  )
                )}
              </div>
            ))}
            {write && (
              <Select defaultValue="" aria-label="Add a member" className="mt-2">
                <option value="" disabled>
                  Add a member
                </option>
                {MEMBERS.filter((member) => !members.includes(member)).map((member) => (
                  <option key={member.id}>{member.email}</option>
                ))}
              </Select>
            )}
          </section>
          <section>
            <h3 className="label-caps border-b pb-1.5">Projects</h3>
            {projects.map((project) => (
              <div key={project.id} className={line}>
                <PLink to={`/${org}/settings/projects/${project.slug}`} className="mono min-w-0 flex-1 truncate hover:underline">
                  {project.slug}
                </PLink>
                {write && (
                  <Button size="sm" variant="ghost" className="max-lg:h-11">
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {write && (
              <Select defaultValue="" aria-label="Add a project" className="mt-2">
                <option value="" disabled>
                  Add a project
                </option>
                {PROJECTS.filter((project) => !projects.includes(project)).map((project) => (
                  <option key={project.id}>{project.slug}</option>
                ))}
              </Select>
            )}
          </section>
          {write && (
            <div className="flex gap-2 lg:col-span-2">
              <Button className="max-lg:h-11">Rename</Button>
              {can('team:admin') && (
                <Button variant="destructive" className="max-lg:h-11">
                  Delete team
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/* ---------- new project: choose on one screen, then only the snippet and the wait ---------- */

// The platform choices under group headers, with the chosen one kept in view.
function PlatformList({ value, onChange, className }: { value: string; onChange: (id: string) => void; className?: string }) {
  const [query, setQuery] = useState('')
  const chosen = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const shown = PLATFORMS.filter((platform) => platform.name.toLowerCase().includes(query.toLowerCase()))
  const groups = [...new Set(shown.map((platform) => platform.group))]
  useEffect(() => {
    const box = list.current
    const item = chosen.current
    // Scroll the list only, never the page.
    if (box && item) box.scrollTop = item.offsetTop - box.clientHeight / 2 + item.clientHeight / 2
  }, [value, query])
  return (
    <div className="border">
      <div className="relative border-b">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a platform" aria-label="Find a platform" className="border-0 pl-8" />
      </div>
      <div ref={list} className={cn('relative overflow-y-auto', className)} role="radiogroup" aria-label="Platform">
        {groups.map((group) => (
          <div key={group}>
            <h3 className="label-caps sticky top-0 flex h-7 items-center border-b bg-muted px-3">{group}</h3>
            {shown
              .filter((platform) => platform.group === group)
              .map((platform) => (
                <button
                  key={platform.id}
                  ref={platform.id === value ? chosen : undefined}
                  type="button"
                  role="radio"
                  aria-checked={platform.id === value}
                  onClick={() => onChange(platform.id)}
                  className={cn('flex h-9 w-full items-center px-3 text-left text-sm max-lg:h-11', platform.id === value ? 'bg-foreground font-medium text-background' : 'bg-card hover:bg-accent')}
                >
                  {platform.name}
                </button>
              ))}
          </div>
        ))}
        {shown.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No platform matches. Choose Other to get the DSN alone.</p>}
      </div>
    </div>
  )
}

// The install step: the wait, the DSN, the two things to paste. Nothing else.
function Install({ slug, platformId, arrived }: { slug: string; platformId: string; arrived: boolean }) {
  const [platform, setPlatform] = useState(platformId)
  const [changing, setChanging] = useState(false)
  const dsn = KEYS[0]!.dsn.public!
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Add {platformName(platform)} to <span className="font-mono text-lg">{slug}</span>
        </h1>
        <button type="button" onClick={() => setChanging(true)} className="text-sm font-medium whitespace-nowrap text-brand underline-offset-4 hover:underline max-lg:h-11">
          Change platform
        </button>
      </div>
      {arrived ? (
        <div role="status" className="border border-ok/60">
          <div className="flex min-h-11 items-center gap-2.5 px-3">
            <span className="size-2.5 shrink-0 bg-ok" />
            <span className="font-medium">First event received</span>
            <span className="mono ml-auto text-muted-foreground">4s ago</span>
          </div>
          <PLink to="/" className="flex min-h-12 items-center gap-2.5 border-t border-ok/60 px-3 hover:bg-accent">
            <LevelGlyph level="error" />
            <span className="flex min-w-0 flex-1 flex-col py-1.5 lg:flex-row lg:items-baseline lg:gap-2">
              <span className="mono font-semibold">ConnectionError</span>
              <span className="truncate">dial tcp 10.0.0.12:5432: connection refused</span>
            </span>
            <span className="text-sm font-medium whitespace-nowrap text-brand">Open issue</span>
            <ChevronRight className="size-4 shrink-0 text-brand" />
          </PLink>
        </div>
      ) : (
        <div role="status" className="flex min-h-11 items-center gap-2.5 border border-dashed px-3">
          <span className="size-2.5 shrink-0 border border-foreground/60" />
          <span className="font-medium">Waiting for the first event</span>
        </div>
      )}
      <Field label="DSN">
        <CopyField value={dsn} label="DSN" />
      </Field>
      <Snippets platform={platformOf(platform)} dsn={dsn} wrap />
      <Modal open={changing} onClose={() => setChanging(false)} title="Change platform">
        <PlatformList
          value={platform}
          onChange={(id) => {
            setPlatform(id)
            setChanging(false)
          }}
          className="max-h-80"
        />
      </Modal>
    </div>
  )
}

function NewProject({ org }: { org: string }) {
  const { search } = useProto()
  const go = useGo()
  const [platform, setPlatform] = useState('go')
  const [name, setName] = useState('')
  const [team, setTeam] = useState(TEAMS[0]!.slug)
  const base = `/${org}/settings/projects`
  if (search.created)
    return (
      <>
        <Bar back={`/${org}/settings`} title={search.created} mono>
          <Button asChild size="sm" className="max-lg:h-9">
            <PLink to={`${base}/${search.created}`}>Project settings</PLink>
          </Button>
        </Bar>
        <Sheet className="p-3 md:p-4">
          <Install slug={search.created} platformId={search.tab ?? 'other'} arrived={search.open === 'arrived'} />
        </Sheet>
      </>
    )
  return (
    <>
      <Bar back={`/${org}/settings`} title="New project" />
      <div className="grid flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 border-b p-3 md:p-4 lg:border-r lg:border-b-0">
          <Field label="Project name">
            <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={64} />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Platform</span>
            <PlatformList value={platform} onChange={setPlatform} className="max-h-56 lg:max-h-[24rem]" />
          </div>
          <Field label="Team">
            <Select value={team} onChange={(event) => setTeam(event.target.value)}>
              {TEAMS.map((t) => (
                <option key={t.slug} value={t.slug}>
                  #{t.slug}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="default" className="max-lg:h-11 lg:self-start" disabled={!name.trim()} onClick={() => go(`${base}/new`, { created: name.trim().toLowerCase().replace(/\s+/g, '-'), tab: platform })}>
            Create project
          </Button>
        </div>
        <div className="flex min-w-0 flex-col gap-3 p-3 md:p-4">
          <div className="flex min-h-8 items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{platformName(platform)}</h2>
            <Tag>Preview</Tag>
          </div>
          <Snippets platform={platformOf(platform)} dsn={DSN_PLACEHOLDER} wrap className="max-w-3xl" />
        </div>
      </div>
    </>
  )
}

/* ---------- projects home: grouped by organisation, searchable ---------- */

const HOME_GRID = 'grid items-center gap-x-4 px-3 md:px-4 grid-cols-[3rem_minmax(0,1fr)_5.5rem] lg:grid-cols-[4rem_minmax(0,1fr)_18rem_5rem_6.5rem]'

function Home({ org }: { org?: string }) {
  const { can } = useProto()
  const [query, setQuery] = useState('')
  const rows = HOME.filter((row) => !org || row.org === org)
    .filter((row) => `${row.org} ${row.project.slug} ${platformName(row.project.platform)}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''))
  const orgs = [...new Set(rows.map((row) => row.org))]
  return (
    <>
      <PageBar>
        <span className="font-semibold">Projects</span>
        {org && <span className="mono text-muted-foreground">{org}</span>}
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a project" aria-label="Find a project" className="h-8 w-56 max-lg:hidden" />
        {can('project:write') && (
          <Button asChild variant="default" size="sm" className="ml-auto max-lg:h-9">
            <PLink to={`/${org ?? ORG.slug}/settings/projects/new`}>
              <Plus />
              New project
            </PLink>
          </Button>
        )}
      </PageBar>
      <div className="border-b px-3 py-2 lg:hidden">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a project" aria-label="Find a project" className="h-9" />
      </div>
      <div className={cn(HOME_GRID, 'h-8 border-b')}>
        <span className="label-caps text-right">Open</span>
        <span className="label-caps">Project</span>
        <AxisLabel />
        <span className="label-caps text-right whitespace-nowrap max-lg:hidden">Last seen</span>
        <span className="max-lg:hidden" />
      </div>
      {orgs.map((slug) => (
        <section key={slug}>
          {!org && (
            <div className="flex h-8 items-center gap-2 border-b bg-muted px-3 md:px-4">
              <h2 className="mono font-medium">{slug}</h2>
              <span className="mono text-muted-foreground">{rows.filter((row) => row.org === slug).length}</span>
            </div>
          )}
          <ul>
            {rows
              .filter((row) => row.org === slug)
              .map((row) => (
                <HomeRow key={row.project.id} row={row} />
              ))}
          </ul>
        </section>
      ))}
      {rows.length === 0 && <p className="px-3 py-10 text-center text-muted-foreground">No project matches “{query}”.</p>}
    </>
  )
}

function HomeRow({ row }: { row: ProjectRow }) {
  const { can } = useProto()
  const fresh = !row.project.firstEvent
  const settings = `/${row.org}/settings/projects/${row.project.slug}`
  return (
    <li className={cn(HOME_GRID, 'relative min-h-14 border-b hover:bg-accent')}>
      <PLink to={fresh ? settings : `/${row.org}/projects`} className="absolute inset-0" aria-label={fresh ? `Set up ${row.project.name}` : `Issues in ${row.project.name}`}>
        {null}
      </PLink>
      <span className={cn('mono text-right text-lg font-medium', row.unresolved === 0 && 'text-muted-foreground')}>{fresh ? '' : row.unresolved}</span>
      <div className="flex min-w-0 flex-col py-2">
        <span className="mono truncate font-medium">{row.project.slug}</span>
        <span className="truncate text-sm text-muted-foreground">
          {platformName(row.project.platform)}
          <span className="lg:hidden">{row.lastSeen ? ` · ${ago(row.lastSeen, NOW)}` : ''}</span>
        </span>
      </div>
      {fresh ? <span className="text-sm text-muted-foreground">No events yet</span> : <Trace buckets={row.buckets} height={24} />}
      <span className="mono text-right text-muted-foreground max-lg:hidden">{row.lastSeen ? ago(row.lastSeen, NOW) : ''}</span>
      <PLink to={settings} className="relative z-10 flex h-8 items-center justify-end gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground max-lg:hidden">
        {fresh && can('project:write') ? <Plug className="size-4" /> : <Settings className="size-4" />}
        {fresh && can('project:write') ? 'Set up' : 'Settings'}
      </PLink>
    </li>
  )
}
