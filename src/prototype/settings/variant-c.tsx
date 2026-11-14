// THROWAWAY PROTOTYPE. Variant C, "Places": there is no Settings area. Projects is a top-level section and each project
// is one page with its keys first; people and organisation pages hang off the organisation menu. A new project is a
// short dialog, and the SDK setup lives on the project's own page until the first event arrives.
import { Boxes, Building2, Ellipsis, Plus, ScrollText, Search, Settings, UserRound, UsersRound, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ago } from '@/features/issues/format'
import { Trace } from '@/features/issues/parts'
import { cn } from '@/lib/utils'
import { ENVIRONMENTS, HOME, KEYS, ME, MEMBERS, NOW, ORG, OrgRole, PROJECTS, ROLES, TEAMS, type Member, type ProjectRow } from './data'
import {
  CopyButton,
  CopyField,
  DeleteDialog,
  Field,
  Initials,
  InviteDialog,
  Modal,
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
import { AxisLabel, FirstEvent, KeyDialog, Snippets, dateText, rateLimitText } from './parts'
import { PLATFORMS, platformName, platformOf } from './platforms'
import { NewOrganization, SignInApps, SystemInfo, type Screen } from './screens'

export function VariantC({ screen }: { screen: Screen }) {
  const org = 'org' in screen ? screen.org : ORG.slug
  const base = `/${org}/settings`
  const inProjects = ['home', 'orgProjects', 'project', 'newProject'].includes(screen.kind)
  const projects = { label: 'Projects', to: `/${org}/projects`, current: inProjects, icon: Boxes }
  const orgPages = [
    { label: 'Members', to: `${base}/members`, current: ['members', 'member', 'invite'].includes(screen.kind), icon: UserRound },
    { label: 'Teams', to: `${base}/teams`, current: screen.kind === 'teams' || screen.kind === 'team', icon: UsersRound },
    { label: 'Organization', to: base, current: screen.kind === 'org' || screen.kind === 'signIn', icon: Building2 },
  ]
  return (
    <ProtoShell
      org={org}
      nav={[projects]}
      orgMenu={[...orgPages, { label: 'Sign-in apps', to: `${base}/sign-in` }, { label: 'System info', to: '/system-info' }]}
      more={[{ label: 'Logs', icon: ScrollText }, projects, ...orgPages]}
    >
      {screen.kind === 'home' || screen.kind === 'orgProjects' || screen.kind === 'newProject' ? (
        <Projects org={screen.kind === 'home' ? undefined : screen.org} creating={screen.kind === 'newProject'} />
      ) : screen.kind === 'project' ? (
        <ProjectPlace org={org} slug={screen.slug} />
      ) : screen.kind === 'members' || screen.kind === 'invite' || screen.kind === 'member' ? (
        <People org={org} inviting={screen.kind === 'invite'} openId={screen.kind === 'member' ? screen.id : undefined} />
      ) : screen.kind === 'teams' || screen.kind === 'team' ? (
        <TeamBoard org={org} focus={screen.kind === 'team' ? screen.team : undefined} />
      ) : screen.kind === 'newOrg' ? (
        <div className="flex flex-1 justify-center px-3 py-10 md:px-4">
          <NewOrganization />
        </div>
      ) : (
        <>
          <PageBar>
            <span className="font-semibold">{screen.kind === 'systemInfo' ? 'System info' : 'Organization'}</span>
            {screen.kind !== 'systemInfo' && <span className="mono text-muted-foreground">{org}</span>}
          </PageBar>
          {screen.kind === 'org' && <Organization org={org} />}
          {screen.kind === 'signIn' && <SignInApps />}
          {screen.kind === 'systemInfo' && (
            <div className="px-3 py-5 md:px-4">
              <SystemInfo />
            </div>
          )}
        </>
      )}
    </ProtoShell>
  )
}

/* ---------- projects: a tile per project ---------- */

function Projects({ org, creating }: { org?: string; creating: boolean }) {
  const { can } = useProto()
  const go = useGo()
  const rows = HOME.filter((row) => !org || row.org === org)
  const orgs = [...new Set(rows.map((row) => row.org))]
  const here = org ? `/${org}/projects` : '/'
  return (
    <>
      <PageBar>
        <span className="font-semibold">Projects</span>
        {org && <span className="mono text-muted-foreground">{org}</span>}
        <AxisLabel className="ml-6 w-40 max-lg:hidden" />
        {can('project:write') && (
          <Button variant="default" size="sm" className="ml-auto max-lg:h-9" onClick={() => go(`/${org ?? ORG.slug}/settings/projects/new`)}>
            <Plus />
            New project
          </Button>
        )}
      </PageBar>
      {orgs.map((slug) => (
        <section key={slug}>
          {!org && (
            <div className="flex h-8 items-center gap-2 border-b bg-muted px-3 md:px-4">
              <span className="mono font-medium">{slug}</span>
              <span className="mono text-muted-foreground">{rows.filter((row) => row.org === slug).length}</span>
            </div>
          )}
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rows
              .filter((row) => row.org === slug)
              .map((row) => (
                <Tile key={row.project.id} row={row} />
              ))}
          </ul>
        </section>
      ))}
      <NewProjectDialog open={creating} onClose={() => go(here, undefined, true)} org={org ?? ORG.slug} />
    </>
  )
}

function Tile({ row }: { row: ProjectRow }) {
  const { project } = row
  const place = `/${row.org}/settings/projects/${project.slug}`
  const fresh = !project.firstEvent
  return (
    <li className="relative flex flex-col gap-3 border-r border-b p-3 hover:bg-accent md:p-4">
      <PLink to={fresh ? place : `/${row.org}/projects`} className="absolute inset-0" aria-label={fresh ? `Set up ${project.name}` : `Issues in ${project.name}`}>
        {null}
      </PLink>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="mono truncate text-base font-semibold">{project.slug}</h2>
        <span className="text-sm whitespace-nowrap text-muted-foreground">{platformName(project.platform)}</span>
      </div>
      {fresh ? (
        <div className="flex h-[4.25rem] items-center gap-2.5 text-muted-foreground">
          <span className="size-2.5 border border-foreground/60" />
          No events yet
        </div>
      ) : (
        <div className="flex h-[4.25rem] items-end gap-4">
          <div className="flex flex-col">
            <span className={cn('mono text-3xl font-medium', row.unresolved === 0 && 'text-muted-foreground')}>{row.unresolved}</span>
            <span className="label-caps mt-1.5">unresolved</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Trace buckets={row.buckets} height={40} />
            <span className="mono text-right text-xs text-muted-foreground">last seen {row.lastSeen ? ago(row.lastSeen, NOW) : ''}</span>
          </div>
        </div>
      )}
      <div className="relative z-10 flex items-center gap-2">
        {fresh ? (
          <Button asChild size="sm" variant="default" className="max-lg:h-9">
            <PLink to={place}>Set up</PLink>
          </Button>
        ) : (
          <CopyButton text={KEYS[0]!.dsn.public!} label="Copy DSN" className="max-lg:h-9" />
        )}
        <Button asChild size="sm" className="max-lg:h-9">
          <PLink to={place}>
            <Settings />
            Settings
          </PLink>
        </Button>
        <span className="mono ml-auto truncate text-xs text-muted-foreground">{project.teams.map((team) => `#${team.slug}`).join(' ')}</span>
      </div>
    </li>
  )
}

function NewProjectDialog({ open, onClose, org }: { open: boolean; onClose: () => void; org: string }) {
  const go = useGo()
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('go')
  const [team, setTeam] = useState(TEAMS[0]!.slug)
  const shown = PLATFORMS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      footer={
        <>
          <Button className="max-lg:h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" className="max-lg:h-11" disabled={!name.trim()} onClick={() => go(`/${org}/settings/projects/billing-worker`)}>
            Create project
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={64} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Platform</span>
        <div className="border">
          <div className="relative border-b">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={platformName(platform)} aria-label="Find a platform" className="border-0 pl-8" />
          </div>
          <div className="grid max-h-40 grid-cols-2 overflow-y-auto" role="radiogroup" aria-label="Platform">
            {shown.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === platform}
                onClick={() => setPlatform(p.id)}
                className={cn('flex h-9 items-center px-3 text-left text-sm max-lg:h-11', p.id === platform ? 'bg-foreground font-medium text-background' : 'hover:bg-accent')}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
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
    </Modal>
  )
}

/* ---------- a project's page: keys first, details beside ---------- */

function Block({ id, label, action, children }: { id?: string; label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-14 border-b">
      <div className="flex h-10 items-center justify-between px-3 md:px-4">
        <h2 className="label-caps">{label}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ProjectPlace({ org, slug }: { org: string; slug: string }) {
  const { can, search } = useProto()
  const project = PROJECTS.find((p) => p.slug === slug) ?? PROJECTS[0]!
  const fresh = !project.firstEvent
  const write = can('project:write')
  const [platform, setPlatform] = useState(project.platform ?? 'other')
  const [editingKey, setEditingKey] = useState<string | null>(search.open === 'key' ? KEYS[1]!.id : null)
  const [security, setSecurity] = useState<string | null>(null)
  const [editing, setEditing] = useState(search.open === 'details')
  const [deleting, setDeleting] = useState(false)
  const [hidden, setHidden] = useState(() => new Set(ENVIRONMENTS.filter((e) => e.isHidden).map((e) => e.name)))
  const keys = fresh ? KEYS.slice(0, 1) : KEYS
  useEffect(() => {
    if (search.tab && search.tab !== 'general') document.getElementById(search.tab)?.scrollIntoView()
  }, [search.tab])
  return (
    <>
      <PageBar>
        <PLink to={`/${org}/projects`} className="font-semibold text-muted-foreground hover:text-foreground max-lg:hidden">
          Projects
        </PLink>
        <span className="text-muted-foreground max-lg:hidden">/</span>
        <span className="mono truncate font-semibold">{slug}</span>
        <span className="text-sm text-muted-foreground max-lg:hidden">{platformName(platform)}</span>
        <Button asChild size="sm" className="ml-auto max-lg:h-9">
          <PLink to={`/${org}/projects`}>Issues</PLink>
        </Button>
      </PageBar>
      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 lg:border-r">
          {fresh && (
            <Block
              label="Set up"
              action={
                write && (
                  <Select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Platform" className="h-8 w-auto max-lg:h-9">
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )
              }
            >
              <div className="flex max-w-3xl flex-col gap-3 px-3 pb-4 md:px-4">
                <Snippets platform={platformOf(platform)} dsn={KEYS[0]!.dsn.public!} />
                <FirstEvent arrived={false} />
              </div>
            </Block>
          )}
          <Block
            id="dsn"
            label="Client keys"
            action={
              write && (
                <Button size="sm" variant="ghost" className="max-lg:h-9" onClick={() => setEditingKey('new')}>
                  <Plus />
                  New key
                </Button>
              )
            }
          >
            <div className="flex max-w-3xl flex-col gap-4 px-3 pb-4 md:px-4">
              {keys.map((key) => (
                <div key={key.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{key.name}</span>
                    <span className="mono text-muted-foreground">{rateLimitText(key)}</span>
                    {write && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="ml-auto max-lg:size-11" aria-label={`Actions for ${key.name}`}>
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditingKey(key.id)}>Rename or limit</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setSecurity(security === key.id ? null : key.id)}>Security report address</DropdownMenuItem>
                          <DropdownMenuItem destructive>Delete key</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <CopyField value={key.dsn.public!} label={`DSN for ${key.name}`} />
                  {security === key.id && (
                    <Field label="Security report address">
                      <CopyField value={key.dsn.security!} label="Security report address" />
                    </Field>
                  )}
                </div>
              ))}
            </div>
          </Block>
          {!fresh && (
            <>
              <Block id="environments" label="Environments">
                <ul className="border-t">
                  {ENVIRONMENTS.map((environment) => (
                    <li key={environment.name} className="flex min-h-11 items-center justify-between gap-3 border-b px-3 last:border-b-0 md:px-4">
                      <span className={cn('mono', hidden.has(environment.name) && 'text-muted-foreground line-through')}>{environment.name}</span>
                      {write ? (
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
                      )}
                    </li>
                  ))}
                </ul>
              </Block>
              <Block
                id="alerts"
                label="Alerts"
                action={
                  write && (
                    <Button size="sm" variant="ghost" className="max-lg:h-9">
                      <Plus />
                      New alert
                    </Button>
                  )
                }
              >
                <ul className="border-t">
                  {[
                    ['Error burst', '10 events in 1 minute · email, Slack'],
                    ['Uptime', 'A check fails · email'],
                  ].map(([name, summary]) => (
                    <li key={name} className="flex min-h-11 cursor-pointer items-center gap-3 border-b px-3 last:border-b-0 hover:bg-accent md:px-4">
                      <span className="w-28 shrink-0 font-medium">{name}</span>
                      <span className="min-w-0 truncate text-muted-foreground">{summary}</span>
                    </li>
                  ))}
                </ul>
              </Block>
            </>
          )}
        </div>
        <aside id="general" className="max-lg:border-t">
          <div className="flex h-10 items-center justify-between px-3 md:px-4">
            <h2 className="label-caps">Details</h2>
            {write && (
              <Button size="sm" variant="ghost" className="max-lg:h-9" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
          <dl className="border-t">
            {[
              ['Name', project.name],
              ['Platform', platformName(platform)],
              ['Teams', project.teams.map((team) => `#${team.slug}`).join('  '), true],
              ['Events dropped', `${project.eventThrottleRate}%`, true],
              ['IP addresses', project.scrubIPAddresses ? 'Not stored' : 'Stored'],
              ['Created', dateText(project.dateCreated), true],
            ].map(([label, value, mono]) => (
              <div key={String(label)} className="flex min-h-10 items-center justify-between gap-4 border-b px-3 max-lg:min-h-11 md:px-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={cn('truncate', mono && 'mono')}>{value}</dd>
              </div>
            ))}
          </dl>
          {can('project:admin') && (
            <div className="p-3 md:p-4">
              <Button variant="destructive" className="max-lg:h-11" onClick={() => setDeleting(true)}>
                Delete project
              </Button>
            </div>
          )}
        </aside>
      </div>
      {editingKey && <KeyDialog open onClose={() => setEditingKey(null)} keyItem={KEYS.find((key) => key.id === editingKey)} />}
      <DetailsDialog open={editing} onClose={() => setEditing(false)} slug={slug} />
      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} what="project" name={slug} loses="Its issues, events, client keys and alerts are deleted for good." />
    </>
  )
}

function DetailsDialog({ open, onClose, slug }: { open: boolean; onClose: () => void; slug: string }) {
  const project = PROJECTS.find((p) => p.slug === slug) ?? PROJECTS[0]!
  const [teams, setTeams] = useState(project.teams.map((team) => team.slug))
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${slug}`}
      footer={
        <>
          <Button className="max-lg:h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" className="max-lg:h-11" onClick={onClose}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input defaultValue={project.name} maxLength={64} />
      </Field>
      <Field label="Platform">
        <Select defaultValue={project.platform ?? 'other'}>
          {PLATFORMS.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Teams with access</span>
        <TeamChecks value={teams} onChange={setTeams} />
      </div>
      <Field label="Events to drop (%)" className="max-w-40">
        <Input defaultValue={project.eventThrottleRate} inputMode="numeric" className="font-mono" />
      </Field>
    </Modal>
  )
}

/* ---------- people: members against teams ---------- */

function PeopleBar({ org, at, children }: { org: string; at: 'members' | 'teams'; children?: ReactNode }) {
  const link = (to: string, label: string, count: number, current: boolean) => (
    <PLink
      to={to}
      aria-current={current ? 'page' : undefined}
      className={cn('flex h-full items-center gap-1.5 border-y-2 border-transparent text-sm font-medium', current ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}
    >
      {label}
      <span className="mono text-muted-foreground">{count}</span>
    </PLink>
  )
  return (
    <PageBar>
      <span className="mono font-semibold max-lg:hidden">{org}</span>
      <span className="flex h-full items-stretch gap-5 lg:ml-3">
        {link(`/${org}/settings/members`, 'Members', MEMBERS.length, at === 'members')}
        {link(`/${org}/settings/teams`, 'Teams', TEAMS.length, at === 'teams')}
      </span>
      <span className="ml-auto flex items-center gap-2">{children}</span>
    </PageBar>
  )
}

const MATRIX = 'grid items-center gap-x-3 px-3 md:px-4 grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_9rem_repeat(3,6rem)_2rem]'

function People({ org, inviting, openId }: { org: string; inviting: boolean; openId?: string }) {
  const { can, role: myRole } = useProto()
  const go = useGo()
  const base = `/${org}/settings/members`
  const [roles, setRoles] = useState<Record<string, OrgRole>>(() => Object.fromEntries(MEMBERS.map((member) => [member.id, member.role])))
  const [teams, setTeams] = useState<Record<string, string[]>>(() => Object.fromEntries(MEMBERS.map((member) => [member.id, member.teams])))
  const write = can('member:write')
  const opened = MEMBERS.find((member) => member.id === openId)
  return (
    <>
      <PeopleBar org={org} at="members">
        {write && (
          <Button variant="default" size="sm" className="max-lg:h-9" onClick={() => go(`${base}/new`)}>
            <Plus />
            Invite members
          </Button>
        )}
      </PeopleBar>
      <div className={cn(MATRIX, 'h-8 border-b max-lg:hidden')}>
        <span className="label-caps">Member</span>
        <span className="label-caps">Role</span>
        {TEAMS.map((team) => (
          <PLink key={team.slug} to={`/${org}/settings/teams/${team.slug}/members`} className="mono text-center text-muted-foreground hover:text-foreground">
            #{team.slug}
          </PLink>
        ))}
        <span />
      </div>
      <ul>
        {MEMBERS.map((member) => {
          const editable = write && (member.role !== OrgRole.owner || myRole === OrgRole.owner) && member.id !== ME
          const mine = teams[member.id] ?? []
          return (
            <li key={member.id} className={cn(MATRIX, 'relative min-h-14 border-b hover:bg-accent')}>
              <PLink to={`${base}/${member.id}`} className="absolute inset-0" aria-label={member.email}>
                {null}
              </PLink>
              <div className="flex min-w-0 items-center gap-3 py-2">
                <Initials member={member} />
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{member.user?.name || member.email}</span>
                    {member.pending && <Tag>Invited</Tag>}
                    {member.id === ME && <Tag>You</Tag>}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {member.user?.name ? member.email : `Invited ${ago(member.dateCreated, NOW)} ago`}
                    <span className="lg:hidden">
                      {' · '}
                      {roleLabel(member.role)}
                    </span>
                  </span>
                </div>
              </div>
              <span className="mono text-right text-xs text-muted-foreground lg:hidden">{mine.map((team) => `#${team}`).join(' ')}</span>
              {editable ? (
                <Select
                  value={roles[member.id]}
                  onChange={(event) => setRoles({ ...roles, [member.id]: event.target.value as OrgRole })}
                  aria-label={`Role of ${member.email}`}
                  className="relative z-10 h-8 text-sm max-lg:hidden"
                >
                  {ROLES.filter((role) => myRole === OrgRole.owner || role.value !== OrgRole.owner).map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <span className="px-2 text-sm max-lg:hidden">{roleLabel(member.role)}</span>
              )}
              {TEAMS.map((team) => (
                <span key={team.slug} className="relative z-10 flex justify-center max-lg:hidden">
                  {write ? (
                    <Checkbox
                      hit
                      checked={mine.includes(team.slug)}
                      aria-label={`${member.email} in ${team.slug}`}
                      onCheckedChange={(on) => setTeams({ ...teams, [member.id]: on ? [...mine, team.slug] : mine.filter((slug) => slug !== team.slug) })}
                    />
                  ) : (
                    mine.includes(team.slug) && <span className="size-2 bg-foreground/60" aria-label={`In ${team.slug}`} />
                  )}
                </span>
              ))}
              {write && member.id !== ME ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative z-10 max-lg:hidden" aria-label={`Actions for ${member.email}`}>
                      <Ellipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {member.pending && <DropdownMenuItem>Resend invite</DropdownMenuItem>}
                    {member.pending && <DropdownMenuItem>Copy invite link</DropdownMenuItem>}
                    {!member.pending && myRole === OrgRole.owner && <DropdownMenuItem>Transfer ownership</DropdownMenuItem>}
                    <DropdownMenuItem destructive>{member.pending ? 'Cancel invite' : 'Remove from organization'}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="max-lg:hidden" />
              )}
            </li>
          )
        })}
      </ul>
      <InviteDialog open={inviting} onClose={() => go(base, undefined, true)} />
      {opened && <MemberDialog member={opened} onClose={() => go(base, undefined, true)} />}
    </>
  )
}

function MemberDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const { can, role: myRole, search } = useProto()
  const [role, setRole] = useState(member.role)
  const [teams, setTeams] = useState(member.teams)
  const editable = can('member:write') && (member.role !== OrgRole.owner || myRole === OrgRole.owner)
  return (
    <Modal
      open
      onClose={onClose}
      title={member.user?.name || member.email}
      footer={
        editable ? (
          <>
            {member.id !== ME && (
              <Button variant="destructive" className="mr-auto max-lg:h-11">
                {member.pending ? 'Cancel invite' : 'Remove'}
              </Button>
            )}
            <Button className="max-lg:h-11" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="default" className="max-lg:h-11" onClick={onClose}>
              Save
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="flex items-center gap-3">
        <Initials member={member} />
        <span className="min-w-0 truncate text-muted-foreground">{member.email}</span>
        {member.pending && <Tag>Invited</Tag>}
      </div>
      {editable ? (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Role</span>
            <RolePicker value={role} onChange={setRole} allowOwner={myRole === OrgRole.owner} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Teams</span>
            <TeamChecks value={teams} onChange={setTeams} />
          </div>
          {member.pending && (
            <Field label="Invite link">
              <CopyField value={`https://errors.demo-co.example/accept/${member.id}/d1x9-3f0a7c2be41d5a6f8b90/`} label="Invite link" />
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            {member.pending && search.email !== 'off' && <Button className="max-lg:h-11">Resend invite</Button>}
            {myRole === OrgRole.owner && !member.pending && member.id !== ME && <Button className="max-lg:h-11">Transfer ownership</Button>}
          </div>
        </>
      ) : (
        <dl className="flex gap-8">
          <div>
            <dt className="text-sm text-muted-foreground">Role</dt>
            <dd>{roleLabel(member.role)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Teams</dt>
            <dd className="mono">{member.teams.map((team) => `#${team}`).join('  ') || 'None'}</dd>
          </div>
        </dl>
      )}
    </Modal>
  )
}

/* ---------- teams: a column per team ---------- */

function TeamBoard({ org, focus }: { org: string; focus?: string }) {
  const { can } = useProto()
  const write = can('team:write')
  useEffect(() => {
    if (focus) document.getElementById(`team-${focus}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [focus])
  const line = 'flex min-h-10 items-center gap-2.5 border-b px-3 max-lg:min-h-11 md:px-4'
  return (
    <>
      <PeopleBar org={org} at="teams">
        {write && (
          <Button variant="default" size="sm" className="max-lg:h-9">
            <Plus />
            New team
          </Button>
        )}
      </PeopleBar>
      <div className="grid flex-1 lg:auto-cols-[minmax(18rem,1fr)] lg:grid-flow-col lg:overflow-x-auto">
        {TEAMS.map((team) => {
          const members = MEMBERS.filter((member) => member.teams.includes(team.slug))
          const projects = PROJECTS.filter((project) => project.teams.some((t) => t.slug === team.slug))
          return (
            <section key={team.slug} id={`team-${team.slug}`} className={cn('scroll-mt-14 border-b lg:border-r lg:border-b-0', focus === team.slug && 'bg-card')}>
              <div className="flex h-12 items-center gap-2 border-b px-3 md:px-4">
                <h2 className="mono min-w-0 flex-1 truncate text-base font-semibold">#{team.slug}</h2>
                {(team.isMember || ORG.openMembership || can('org:write')) && (
                  <Button size="sm" className="max-lg:h-9">
                    {team.isMember ? 'Leave' : 'Join'}
                  </Button>
                )}
                {write && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="max-lg:size-11" aria-label={`Actions for ${team.slug}`}>
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Rename</DropdownMenuItem>
                      {can('team:admin') && <DropdownMenuItem destructive>Delete team</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <h3 className="label-caps flex h-8 items-center border-b bg-muted px-3 md:px-4">Members {members.length}</h3>
              {members.map((member) => (
                <div key={member.id} className={line}>
                  <Initials member={member} className="size-5 text-[0.625rem]" />
                  <PLink to={`/${org}/settings/members/${member.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {member.user?.name || member.email}
                  </PLink>
                  {write && (
                    <button type="button" className="grid size-8 place-items-center text-muted-foreground hover:text-foreground max-lg:size-11" aria-label={`Remove ${member.email} from ${team.slug}`}>
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {write && (
                <div className="border-b p-2">
                  <Select defaultValue="" aria-label={`Add a member to ${team.slug}`} className="h-8 text-sm">
                    <option value="" disabled>
                      Add a member
                    </option>
                    {MEMBERS.filter((member) => !members.includes(member)).map((member) => (
                      <option key={member.id}>{member.email}</option>
                    ))}
                  </Select>
                </div>
              )}
              <h3 className="label-caps flex h-8 items-center border-b bg-muted px-3 md:px-4">Projects {projects.length}</h3>
              {projects.map((project) => (
                <div key={project.id} className={line}>
                  <PLink to={`/${org}/settings/projects/${project.slug}`} className="mono min-w-0 flex-1 truncate hover:underline">
                    {project.slug}
                  </PLink>
                  {write && (
                    <button type="button" className="grid size-8 place-items-center text-muted-foreground hover:text-foreground max-lg:size-11" aria-label={`Remove ${project.slug} from ${team.slug}`}>
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {write && (
                <div className="p-2 max-lg:border-b-0">
                  <Select defaultValue="" aria-label={`Add a project to ${team.slug}`} className="h-8 text-sm">
                    <option value="" disabled>
                      Add a project
                    </option>
                    {PROJECTS.filter((project) => !projects.includes(project)).map((project) => (
                      <option key={project.id}>{project.slug}</option>
                    ))}
                  </Select>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}

/* ---------- organisation ---------- */

function Organization({ org }: { org: string }) {
  const { can } = useProto()
  const [deleting, setDeleting] = useState(false)
  return (
    <div className="flex max-w-2xl flex-col gap-5 px-3 py-5 md:px-4">
      <Field label="Name">
        <Input defaultValue={ORG.name} disabled={!can('org:write')} maxLength={200} />
      </Field>
      <dl className="flex gap-8">
        <div>
          <dt className="text-sm text-muted-foreground">Joining teams</dt>
          <dd>{ORG.openMembership ? 'Anyone in the organization' : 'By invitation'}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Sign-in apps</dt>
          <dd>
            <PLink to={`/${org}/settings/sign-in`} className="text-brand hover:underline">
              None
            </PLink>
          </dd>
        </div>
      </dl>
      {can('org:write') && (
        <Button variant="default" className="self-start max-lg:h-11">
          Save
        </Button>
      )}
      {can('org:admin') && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-t pt-4">
          <span className="font-medium">Delete this organization</span>
          <Button variant="destructive" className="max-lg:h-11" onClick={() => setDeleting(true)}>
            Delete
          </Button>
        </div>
      )}
      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} what="organization" name={ORG.slug} loses={`${PROJECTS.length} projects, their issues and ${MEMBERS.length} memberships are deleted for good.`} />
    </div>
  )
}
