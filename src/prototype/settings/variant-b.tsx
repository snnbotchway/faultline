// THROWAWAY PROTOTYPE. Variant B, "Ledger": settings are one searchable index of rows, each a name and its current value.
// A row unfolds in place to change it; there are no tabs and no detail pages. New project is one screen with a live snippet.
import { ChevronDown, ChevronLeft, ChevronRight, Plus, ScrollText, Search, Settings } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { ago } from '@/features/issues/format'
import { Trace } from '@/features/issues/parts'
import { cn } from '@/lib/utils'
import { ALERT_COUNT, ENVIRONMENTS, HOME, INSTANCE, KEYS, ME, MEMBERS, NOW, ORG, OrgRole, PROJECTS, TEAMS, type Member, type Team } from './data'
import {
  CopyButton,
  CopyField,
  DeleteDialog,
  Field,
  Initials,
  InviteDialog,
  PLink,
  ProtoShell,
  RolePicker,
  Select,
  Switch,
  Tag,
  TeamChecks,
  roleLabel,
  useGo,
  useProto,
} from './kit'
import { AxisLabel, FirstEvent, KeyDialog, Snippets, rateLimitText } from './parts'
import { DSN_PLACEHOLDER, PLATFORMS, platformName, platformOf } from './platforms'
import { NewOrganization, SignInApps, SystemInfo, type Screen } from './screens'

export function VariantB({ screen }: { screen: Screen }) {
  const org = 'org' in screen ? screen.org : ORG.slug
  const outside = screen.kind === 'home' || screen.kind === 'orgProjects' || screen.kind === 'newOrg'
  const settings = { label: 'Settings', to: `/${org}/settings`, current: !outside, icon: Settings }
  const base = `/${org}/settings`
  return (
    <ProtoShell org={org} nav={[settings]} more={[{ label: 'Logs', icon: ScrollText }, settings]}>
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

/* ---------- the ledger: one row shape for every setting ---------- */

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
  return <div className={cn('mx-auto w-full max-w-4xl lg:border-x', className)}>{children}</div>
}

function Head({ id, label, children }: { id?: string; label: string; children?: ReactNode }) {
  return (
    <div id={id} className="flex h-9 scroll-mt-24 items-center justify-between border-b bg-muted pr-2 pl-3 md:pl-4 lg:h-8">
      <h2 className="label-caps">{label}</h2>
      {children}
    </div>
  )
}

const ROW = 'flex min-h-12 w-full items-center gap-3 border-b px-3 text-left md:px-4 lg:min-h-11'

// A setting: its name, its value, and (when it can be changed) the editor it unfolds into.
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

function SaveCancel({ onDone, label = 'Save' }: { onDone: () => void; label?: string }) {
  return (
    <div className="flex gap-2">
      <Button variant="default" className="max-lg:h-11" onClick={onDone}>
        {label}
      </Button>
      <Button className="max-lg:h-11" onClick={onDone}>
        Cancel
      </Button>
    </div>
  )
}

// One row open at a time.
function useOpen(initial: string | null = null) {
  const [open, setOpen] = useState<string | null>(initial)
  return { open, toggle: (id: string) => setOpen(open === id ? null : id), close: () => setOpen(null), is: (id: string) => open === id }
}

/* ---------- settings index ---------- */

type Entry = { path: string[]; value: string; to: string; tab?: string }

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
      const at = (name: string, value: string, tab?: string): Entry => ({ path: [project.slug ?? '', ...name.split(' › ')], value, to, tab })
      return [
        at('Name', project.name),
        at('Platform', platformName(project.platform)),
        at('Teams with access', project.teams.map((team) => `#${team.slug}`).join(' ')),
        at('Events to drop', `${project.eventThrottleRate}%`),
        ...KEYS.map((key) => at(`Client keys › ${key.name}`, key.dsn.public ?? '', 'dsn')),
        at('Client keys › Rate limit', rateLimitText(KEYS[1]!), 'dsn'),
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
  const found = words.length ? entries(org).filter((entry) => words.every((word) => `${entry.path.join(' ')} ${entry.value}`.toLowerCase().includes(word))) : []
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

/* ---------- project: one page, every setting a row ---------- */

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'dsn', label: 'Client keys', count: KEYS.length },
  { id: 'environments', label: 'Environments', count: ENVIRONMENTS.length },
  { id: 'alerts', label: 'Alerts', count: ALERT_COUNT },
]

function ProjectLedger({ org, slug }: { org: string; slug: string }) {
  const { can, search } = useProto()
  const project = PROJECTS.find((p) => p.slug === slug) ?? PROJECTS[0]!
  const base = `/${org}/settings/projects/${slug}`
  const row = useOpen(search.tab === 'dsn' ? `key:${KEYS[0]!.id}` : null)
  const [teams, setTeams] = useState(project.teams.map((team) => team.slug))
  const [hidden, setHidden] = useState(() => new Set(ENVIRONMENTS.filter((e) => e.isHidden).map((e) => e.name)))
  const [editing, setEditing] = useState<string | null>(search.open === 'key' ? KEYS[1]!.id : null)
  const [deleting, setDeleting] = useState(false)
  const write = can('project:write')
  const edit = (id: string) => (write ? () => row.toggle(id) : undefined)
  // The stock ?tab= links land on the matching section.
  useEffect(() => {
    if (search.tab) document.getElementById(search.tab)?.scrollIntoView()
  }, [search.tab])
  const jumps = SECTIONS.map((section) => (
    <PLink key={section.id} to={base} search={{ tab: section.id }} className="flex h-9 items-center gap-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground max-lg:h-11">
      {section.label}
      {section.count !== undefined && <span className="mono">{section.count}</span>}
    </PLink>
  ))
  return (
    <>
      <Bar back={`/${org}/settings`} title={slug} mono>
        <span className="flex items-center gap-4 max-lg:hidden">{jumps}</span>
      </Bar>
      <div className="sticky top-11 z-10 flex gap-4 overflow-x-auto border-b bg-background px-3 lg:hidden">{jumps}</div>
      <Sheet>
        {!project.firstEvent && (
          <div className="flex flex-col gap-3 border-b p-3 md:p-4">
            <FirstEvent arrived={false} />
            <Snippets platform={platformOf(project.platform)} dsn={KEYS[0]!.dsn.public!} />
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
          <TeamChecks value={teams} onChange={setTeams} />
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
        {KEYS.map((key) => (
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
        <Row label="Error burst" value="10 events in 1 minute · email, Slack" open={false} onToggle={() => {}} />
        <Row label="Uptime" value="A check fails · email" open={false} onToggle={() => {}} />

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
      {editing && <KeyDialog open onClose={() => setEditing(null)} keyItem={KEYS.find((key) => key.id === editing)} />}
      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} what="project" name={slug} loses="Its issues, events, client keys and alerts are deleted for good." />
    </>
  )
}

/* ---------- members: rows that unfold ---------- */

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
      <InviteDialog open={inviting} onClose={() => go(base, undefined, true)} />
    </>
  )
}

function MemberRow({ member, open, onToggle }: { member: Member; open: boolean; onToggle: () => void }) {
  const { can, role: myRole, search } = useProto()
  const [role, setRole] = useState(member.role)
  const [teams, setTeams] = useState(member.teams)
  const editable = can('member:write') && (member.role !== OrgRole.owner || myRole === OrgRole.owner)
  return (
    <li className={cn(open && 'bg-card')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={cn('flex min-h-14 w-full items-center gap-3 border-b px-3 text-left hover:bg-accent md:px-4', open && 'border-b-0')}>
        <Initials member={member} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{member.user?.name || member.email}</span>
            {member.pending && <Tag>Invited</Tag>}
            {member.id === ME && <Tag>You</Tag>}
          </span>
          <span className="truncate text-sm text-muted-foreground">{member.user?.name ? member.email : `Invited ${ago(member.dateCreated, NOW)} ago`}</span>
        </span>
        <span className="mono w-40 truncate text-muted-foreground max-lg:hidden">{member.teams.map((team) => `#${team}`).join(' ')}</span>
        <span className="w-20 text-sm lg:w-24">{roleLabel(member.role)}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-b px-3 pb-4 md:px-4 lg:pl-[3.25rem]">
          {editable ? (
            <>
              <div className="flex max-w-md flex-col gap-1.5">
                <span className="text-sm font-medium">Role</span>
                <RolePicker value={role} onChange={setRole} allowOwner={myRole === OrgRole.owner} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Teams</span>
                <TeamChecks value={teams} onChange={setTeams} />
              </div>
              {member.pending && (
                <Field label="Invite link" className="max-w-xl">
                  <CopyField value={`https://errors.demo-co.example/accept/${member.id}/d1x9-3f0a7c2be41d5a6f8b90/`} label="Invite link" />
                </Field>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="default" className="max-lg:h-11" onClick={onToggle}>
                  Save
                </Button>
                {member.pending && search.email !== 'off' && <Button className="max-lg:h-11">Resend invite</Button>}
                {myRole === OrgRole.owner && !member.pending && member.id !== ME && <Button className="max-lg:h-11">Transfer ownership</Button>}
                {member.id !== ME && (
                  <Button variant="destructive" className="max-lg:h-11 lg:ml-auto">
                    {member.pending ? 'Cancel invite' : 'Remove'}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <span className="mono text-muted-foreground">{member.teams.map((team) => `#${team}`).join('  ') || 'No teams'}</span>
          )}
        </div>
      )}
    </li>
  )
}

/* ---------- teams: every team on one page ---------- */

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
  const members = MEMBERS.filter((member) => member.teams.includes(team.slug))
  const projects = PROJECTS.filter((project) => project.teams.some((t) => t.slug === team.slug))
  const write = can('team:write')
  const line = 'flex min-h-10 items-center gap-2.5 border-b last:border-b-0 max-lg:min-h-11'
  return (
    <li className={cn(open && 'bg-card')}>
      <div className={cn('relative flex min-h-14 items-center gap-3 border-b px-3 hover:bg-accent md:px-4', open && 'border-b-0')}>
        <button type="button" aria-expanded={open} onClick={onToggle} className="absolute inset-0" aria-label={`Team ${team.slug}`} />
        <span className="mono w-32 truncate font-medium lg:w-52">#{team.slug}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          <span className="mono">{members.length}</span> members · <span className="mono">{projects.length}</span> projects
        </span>
        {team.isMember && <Tag className="max-lg:hidden">Yours</Tag>}
        {(team.isMember || ORG.openMembership || can('org:write')) && (
          <Button size="sm" className="relative z-10 max-lg:h-9">
            {team.isMember ? 'Leave' : 'Join'}
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
                {write && (
                  <Button size="sm" variant="ghost" className="max-lg:h-11">
                    Remove
                  </Button>
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

/* ---------- new project: one screen, the snippet follows the choices ---------- */

function NewProject({ org }: { org: string }) {
  const { search } = useProto()
  const go = useGo()
  const created = search.created
  const [platform, setPlatform] = useState(search.tab ?? 'javascript-react')
  const [name, setName] = useState(created ?? '')
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState(TEAMS[0]!.slug)
  const base = `/${org}/settings/projects`
  const shown = PLATFORMS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  const chosen = platformOf(platform)
  return (
    <>
      <Bar back={`/${org}/settings`} title={created ?? 'New project'} mono={Boolean(created)}>
        {created && (
          <Button asChild size="sm" className="max-lg:h-9">
            <PLink to={`${base}/${created}`}>Project settings</PLink>
          </Button>
        )}
      </Bar>
      <div className="grid flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 border-b p-3 md:p-4 lg:border-r lg:border-b-0">
          {!created && (
            <Field label="Project name">
              <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={64} />
            </Field>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Platform</span>
            <div className="border">
              <div className="relative border-b">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a platform" aria-label="Find a platform" className="border-0 pl-8" />
              </div>
              <div className={cn('overflow-y-auto', created ? 'max-h-44' : 'max-h-64 lg:max-h-[26rem]')} role="radiogroup" aria-label="Platform">
                {shown.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={p.id === platform}
                    onClick={() => setPlatform(p.id)}
                    className={cn('flex h-9 w-full items-center justify-between px-3 text-left text-sm max-lg:h-11', p.id === platform ? 'bg-foreground font-medium text-background' : 'bg-card hover:bg-accent')}
                  >
                    {p.name}
                    <span className={cn('label-caps', p.id === platform && 'text-background/70')}>{p.group}</span>
                  </button>
                ))}
                {shown.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No platform matches. Choose Other to get the DSN alone.</p>}
              </div>
            </div>
          </div>
          {!created && (
            <>
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
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3 p-3 md:p-4">
          <div className="flex min-h-8 items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{chosen?.name}</h2>
            {created ? <CopyButton text={KEYS[0]!.dsn.public!} label="Copy DSN" /> : <Tag>Preview</Tag>}
          </div>
          {created && <FirstEvent arrived={false} />}
          <Snippets platform={chosen} dsn={created ? KEYS[0]!.dsn.public! : DSN_PLACEHOLDER} className="max-w-3xl" />
        </div>
      </div>
    </>
  )
}

/* ---------- projects home: one flat list, most recently broken first ---------- */

const HOME_GRID = 'grid items-center gap-x-4 px-3 md:px-4 grid-cols-[3rem_minmax(0,1fr)_5.5rem] lg:grid-cols-[4rem_minmax(0,1fr)_18rem_5rem_6.5rem]'

function Home({ org }: { org?: string }) {
  const { can } = useProto()
  const [query, setQuery] = useState('')
  const rows = HOME.filter((row) => !org || row.org === org)
    .filter((row) => `${row.org}/${row.project.slug}`.includes(query.toLowerCase()))
    .sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''))
  return (
    <>
      <PageBar>
        <span className="font-semibold">Projects</span>
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
      <div className={cn(HOME_GRID, 'h-8 border-b')}>
        <span className="label-caps text-right">Open</span>
        <span className="label-caps">Project</span>
        <AxisLabel />
        <span className="label-caps text-right whitespace-nowrap max-lg:hidden">Last seen</span>
        <span className="max-lg:hidden" />
      </div>
      <ul>
        {rows.map((row) => {
          const fresh = !row.project.firstEvent
          const settings = `/${row.org}/settings/projects/${row.project.slug}`
          return (
            <li key={row.project.id} className={cn(HOME_GRID, 'relative min-h-14 border-b hover:bg-accent')}>
              <PLink to={fresh ? settings : `/${row.org}/projects`} className="absolute inset-0" aria-label={fresh ? `Set up ${row.project.name}` : `Issues in ${row.project.name}`}>
                {null}
              </PLink>
              <span className={cn('mono text-right text-lg font-medium', row.unresolved === 0 && 'text-muted-foreground')}>{fresh ? '–' : row.unresolved}</span>
              <div className="flex min-w-0 flex-col py-2">
                <span className="mono truncate">
                  {!org && <span className="text-muted-foreground">{row.org}/</span>}
                  <span className="font-medium">{row.project.slug}</span>
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {platformName(row.project.platform)}
                  <span className="lg:hidden">{row.lastSeen ? ` · ${ago(row.lastSeen, NOW)}` : ''}</span>
                </span>
              </div>
              {fresh ? <span className="text-sm text-muted-foreground">No events yet</span> : <Trace buckets={row.buckets} height={24} />}
              <span className="mono text-right text-muted-foreground max-lg:hidden">{row.lastSeen ? ago(row.lastSeen, NOW) : ''}</span>
              <PLink to={settings} className="relative z-10 flex h-8 items-center justify-end gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground max-lg:hidden">
                <Settings className="size-4" />
                {fresh ? 'Set up' : 'Settings'}
              </PLink>
            </li>
          )
        })}
      </ul>
    </>
  )
}
