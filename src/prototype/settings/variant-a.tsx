// THROWAWAY PROTOTYPE. Variant A, "Rail": one Settings area with a sidebar of organisation sections and projects.
// On a phone the sidebar is the settings home and each section is a page behind it. New project is a two-step page.
import { ChevronLeft, ChevronRight, Ellipsis, Plus, ScrollText, Search, Settings, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ago } from '@/features/issues/format'
import { Trace } from '@/features/issues/parts'
import { cn } from '@/lib/utils'
import { ALERT_COUNT, ENVIRONMENTS, HOME, KEYS, ME, MEMBERS, NOW, ORG, OrgRole, PROJECTS, TEAMS, type Member, type ProjectRow } from './data'
import {
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
  TeamTag,
  roleLabel,
  useGo,
  useProto,
} from './kit'
import { AxisLabel, FirstEvent, KeyDialog, Snippets, dateText, rateLimitText } from './parts'
import { PLATFORMS, platformName, platformOf } from './platforms'
import { NewOrganization, SignInApps, SystemInfo, type Screen } from './screens'

export function VariantA({ screen }: { screen: Screen }) {
  const org = 'org' in screen ? screen.org : ORG.slug
  const outside = screen.kind === 'home' || screen.kind === 'orgProjects' || screen.kind === 'newOrg'
  const settings = { label: 'Settings', to: `/${org}/settings`, current: !outside, icon: Settings }
  return (
    <ProtoShell org={org} nav={[settings]} more={[{ label: 'Logs', icon: ScrollText }, settings]}>
      {screen.kind === 'home' || screen.kind === 'orgProjects' ? (
        <Home org={screen.kind === 'orgProjects' ? screen.org : undefined} />
      ) : screen.kind === 'newOrg' ? (
        <div className="flex flex-1 justify-center px-3 py-10 md:px-4">
          <NewOrganization />
        </div>
      ) : (
        <SettingsArea screen={screen} org={org} />
      )}
    </ProtoShell>
  )
}

/* ---------- projects home ---------- */

const HOME_GRID = 'grid items-center gap-x-4 px-3 md:px-4 grid-cols-[minmax(0,1fr)_6rem_auto] lg:grid-cols-[minmax(0,1fr)_16rem_6.5rem_6rem_6.5rem]'

function Home({ org }: { org?: string }) {
  const { can } = useProto()
  const rows = HOME.filter((row) => !org || row.org === org)
  const orgs = [...new Set(rows.map((row) => row.org))]
  return (
    <>
      <PageBar>
        <span className="font-semibold">Projects</span>
        {org && <span className="mono text-muted-foreground">{org}</span>}
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
        <span className="label-caps">Project</span>
        <AxisLabel />
        <span className="label-caps text-right max-lg:hidden">Unresolved</span>
        <span className="label-caps text-right whitespace-nowrap max-lg:hidden">Last seen</span>
        <span className="max-lg:hidden" />
        <span className="label-caps text-right lg:hidden">Open</span>
      </div>
      {orgs.map((slug) => (
        <section key={slug}>
          {!org && (
            <div className="flex h-8 items-center gap-2 border-b bg-muted px-3 md:px-4">
              <span className="mono font-medium">{slug}</span>
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
    </>
  )
}

function HomeRow({ row }: { row: ProjectRow }) {
  const { project } = row
  const settings = `/${row.org}/settings/projects/${project.slug}`
  const fresh = !project.firstEvent
  return (
    <li className={cn(HOME_GRID, 'relative min-h-14 border-b hover:bg-accent')}>
      <PLink to={fresh ? settings : `/${row.org}/projects`} search={fresh ? { tab: 'dsn' } : undefined} className="absolute inset-0" aria-label={fresh ? `Set up ${project.name}` : `Issues in ${project.name}`}>
        {null}
      </PLink>
      <div className="flex min-w-0 flex-col py-2">
        <span className="truncate font-medium">{project.name}</span>
        <span className="truncate text-sm text-muted-foreground">
          {platformName(project.platform)}
          <span className="lg:hidden">{row.lastSeen ? ` · ${ago(row.lastSeen, NOW)}` : ''}</span>
        </span>
      </div>
      {fresh ? <span className="text-sm text-muted-foreground">No events yet</span> : <Trace buckets={row.buckets} height={24} />}
      <span className={cn('mono text-right text-base font-medium', row.unresolved === 0 && 'text-muted-foreground')}>{fresh ? '' : row.unresolved}</span>
      <span className="mono text-right text-muted-foreground max-lg:hidden">{row.lastSeen ? ago(row.lastSeen, NOW) : ''}</span>
      <PLink to={settings} search={fresh ? { tab: 'dsn' } : undefined} className="relative z-10 flex h-8 items-center justify-end gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground max-lg:hidden">
        <Settings className="size-4" />
        {fresh ? 'Set up' : 'Settings'}
      </PLink>
    </li>
  )
}

/* ---------- the settings area: rail + pane ---------- */

const CRUMB: Partial<Record<Screen['kind'], string>> = {
  org: 'General',
  members: 'Members',
  invite: 'Members',
  member: 'Members',
  teams: 'Teams',
  team: 'Teams',
  signIn: 'Sign-in apps',
  project: 'Projects',
  newProject: 'Projects',
  systemInfo: 'System info',
}

function SettingsArea({ screen, org }: { screen: Exclude<Screen, { kind: 'home' | 'orgProjects' | 'newOrg' }>; org: string }) {
  const { can, search } = useProto()
  const go = useGo()
  // On a phone /:org/settings is the list of sections; "General" opens with ?tab=general.
  const index = screen.kind === 'org' && search.tab !== 'general'
  const base = `/${org}/settings`
  const leaf =
    screen.kind === 'project'
      ? screen.slug
      : screen.kind === 'team'
        ? `#${screen.team}`
        : screen.kind === 'member'
          ? MEMBERS.find((m) => m.id === screen.id)?.email
          : screen.kind === 'newProject'
            ? (search.created ?? 'New')
            : undefined
  const parent = screen.kind === 'member' ? `${base}/members` : screen.kind === 'team' ? `${base}/teams` : base
  return (
    <>
      <PageBar>
        {!index && (
          <PLink to={parent} className="-ml-2 flex h-11 items-center gap-0.5 pr-1 pl-1 text-sm font-medium lg:hidden" aria-label="Back">
            <ChevronLeft className="size-4" />
          </PLink>
        )}
        <span className={cn('font-semibold', !index && 'max-lg:hidden')}>Settings</span>
        <span className={cn('flex min-w-0 items-center gap-3', index && 'max-lg:hidden')}>
          <span className="text-muted-foreground max-lg:hidden">/</span>
          <span className={cn('whitespace-nowrap', leaf ? 'text-muted-foreground max-lg:hidden' : 'font-semibold lg:font-normal')}>{CRUMB[screen.kind]}</span>
          {leaf && (
            <>
              <span className="text-muted-foreground max-lg:hidden">/</span>
              <span className={cn('truncate max-lg:font-semibold', (screen.kind !== 'newProject' || search.created) && 'mono')}>{leaf}</span>
            </>
          )}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {(screen.kind === 'members' || screen.kind === 'invite') && can('member:write') && (
            <Button variant="default" size="sm" className="max-lg:h-9" onClick={() => go(`${base}/members/new`)}>
              <Plus />
              Invite members
            </Button>
          )}
          {screen.kind === 'teams' && can('team:write') && (
            <Button variant="default" size="sm" className="max-lg:h-9">
              <Plus />
              New team
            </Button>
          )}
        </span>
      </PageBar>
      <div className="flex flex-1">
        <aside className={cn('shrink-0 lg:w-60 lg:border-r', index ? 'max-lg:w-full' : 'max-lg:hidden')}>
          <Rail screen={screen} org={org} index={index} />
        </aside>
        <main className={cn('min-w-0 flex-1', index && 'max-lg:hidden')}>
          {screen.kind === 'org' && <OrgGeneral />}
          {(screen.kind === 'members' || screen.kind === 'invite') && <Members org={org} inviting={screen.kind === 'invite'} />}
          {screen.kind === 'member' && <MemberPage id={screen.id} />}
          {screen.kind === 'teams' && <Teams org={org} />}
          {screen.kind === 'team' && <TeamPage org={org} slug={screen.team} tab={screen.tab} />}
          {screen.kind === 'project' && <ProjectPage org={org} slug={screen.slug} />}
          {screen.kind === 'newProject' && <NewProject org={org} />}
          {screen.kind === 'signIn' && <SignInApps />}
          {screen.kind === 'systemInfo' && (
            <Pane>
              <SystemInfo />
            </Pane>
          )}
        </main>
      </div>
    </>
  )
}

function Pane({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex max-w-2xl flex-col gap-5 px-3 py-5 md:px-6', className)}>{children}</div>
}

function Rail({ screen, org, index }: { screen: Screen; org: string; index: boolean }) {
  const { can } = useProto()
  const base = `/${org}/settings`
  const item = (to: string, label: ReactNode, current: boolean, count?: number, tab?: string) => (
    <PLink
      key={to + (tab ?? '')}
      to={to}
      search={tab ? { tab } : undefined}
      aria-current={current && !index ? 'page' : undefined}
      className={cn('flex h-9 items-center gap-2 px-3 text-sm max-lg:h-12 max-lg:border-b max-lg:text-base md:px-4', current && !index ? 'bg-selected font-medium' : 'hover:bg-accent')}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="mono text-muted-foreground">{count}</span>}
      <ChevronRight className="size-4 text-muted-foreground lg:hidden" />
    </PLink>
  )
  const label = (text: string) => <h2 className="label-caps px-3 pt-4 pb-1.5 max-lg:border-b max-lg:pb-2 md:px-4">{text}</h2>
  return (
    <nav aria-label="Settings" className="lg:sticky lg:top-11 lg:pb-4">
      {label(ORG.slug)}
      {item(base, 'General', screen.kind === 'org', undefined, 'general')}
      {item(`${base}/members`, 'Members', ['members', 'member', 'invite'].includes(screen.kind), MEMBERS.length)}
      {item(`${base}/teams`, 'Teams', screen.kind === 'teams' || screen.kind === 'team', TEAMS.length)}
      {item(`${base}/sign-in`, 'Sign-in apps', screen.kind === 'signIn')}
      {label('Projects')}
      {PROJECTS.map((project) =>
        item(`${base}/projects/${project.slug}`, <span className="mono">{project.slug}</span>, screen.kind === 'project' && screen.slug === project.slug),
      )}
      {can('project:write') && (
        <PLink
          to={`${base}/projects/new`}
          className={cn('flex h-9 items-center gap-2 px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground max-lg:h-12 max-lg:border-b max-lg:text-base md:px-4', screen.kind === 'newProject' && 'bg-selected font-medium text-foreground')}
        >
          <Plus className="size-4" />
          New project
        </PLink>
      )}
      {label('Server')}
      {item('/system-info', 'System info', screen.kind === 'systemInfo')}
    </nav>
  )
}

/* ---------- organisation ---------- */

function DangerRow({ label, action }: { label: string; action: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-t pt-4">
      <span className="font-medium">{label}</span>
      {action}
    </div>
  )
}

function OrgGeneral() {
  const { can } = useProto()
  const [deleting, setDeleting] = useState(false)
  return (
    <Pane>
      <Field label="Name">
        <Input defaultValue={ORG.name} disabled={!can('org:write')} maxLength={200} />
      </Field>
      <dl className="flex gap-8">
        <Fact label="Joining teams" value={ORG.openMembership ? 'Anyone in the organization' : 'By invitation'} />
        <Fact label="Created" value={dateText(ORG.dateCreated)} mono />
      </dl>
      {can('org:write') && (
        <Button variant="default" className="self-start max-lg:h-11">
          Save
        </Button>
      )}
      {can('org:admin') && (
        <DangerRow
          label="Delete this organization"
          action={
            <Button variant="destructive" className="max-lg:h-11" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          }
        />
      )}
      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} what="organization" name={ORG.slug} loses={`${PROJECTS.length} projects, their issues and ${MEMBERS.length} memberships are deleted for good.`} />
    </Pane>
  )
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn(mono && 'mono')}>{value}</dd>
    </div>
  )
}

/* ---------- members ---------- */

const MEMBER_GRID = 'grid items-center gap-x-4 px-3 md:px-6 grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_6rem_minmax(0,12rem)_6rem_2rem]'

function Members({ org, inviting }: { org: string; inviting: boolean }) {
  const { can } = useProto()
  const go = useGo()
  const base = `/${org}/settings/members`
  return (
    <>
      <div className={cn(MEMBER_GRID, 'h-8 border-b max-lg:hidden')}>
        <span className="label-caps">Member</span>
        <span className="label-caps">Role</span>
        <span className="label-caps">Teams</span>
        <span className="label-caps text-right">Joined</span>
        <span />
      </div>
      <ul>
        {MEMBERS.map((member) => (
          <li key={member.id} className={cn(MEMBER_GRID, 'relative min-h-14 border-b hover:bg-accent')}>
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
                  <span className="lg:hidden"> · {roleLabel(member.role)}</span>
                </span>
              </div>
            </div>
            <span className="text-sm max-lg:hidden">{roleLabel(member.role)}</span>
            <span className="flex flex-wrap gap-x-2 max-lg:hidden">
              {member.teams.map((team) => (
                <TeamTag key={team} slug={team} />
              ))}
            </span>
            <span className="mono text-right text-muted-foreground max-lg:hidden">{member.pending ? '' : dateText(member.dateCreated).replace(/,? \d{4}$/, '')}</span>
            {can('member:write') && member.id !== ME ? <MemberMenu member={member} /> : <span />}
          </li>
        ))}
      </ul>
      <InviteDialog open={inviting} onClose={() => go(base, undefined, true)} />
    </>
  )
}

function MemberMenu({ member }: { member: Member }) {
  const { search } = useProto()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative z-10 max-lg:size-11" aria-label={`Actions for ${member.email}`}>
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {member.pending && search.email !== 'off' && <DropdownMenuItem>Resend invite</DropdownMenuItem>}
        {member.pending && <DropdownMenuItem>Copy invite link</DropdownMenuItem>}
        <DropdownMenuItem destructive>{member.pending ? 'Cancel invite' : 'Remove from organization'}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MemberPage({ id }: { id: string }) {
  const { can, role: myRole } = useProto()
  const member = MEMBERS.find((m) => m.id === id) ?? MEMBERS[0]!
  const [role, setRole] = useState(member.role)
  const [teams, setTeams] = useState(member.teams)
  const editable = can('member:write') && (member.role !== OrgRole.owner || myRole === OrgRole.owner)
  return (
    <Pane>
      <div className="flex items-center gap-3">
        <Initials member={member} className="size-9 text-sm" />
        <div className="flex min-w-0 flex-col">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <span className="truncate">{member.user?.name || member.email}</span>
            {member.pending && <Tag>Invited</Tag>}
          </h1>
          {member.user?.name && <span className="truncate text-sm text-muted-foreground">{member.email}</span>}
        </div>
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
          <Button variant="default" className="self-start max-lg:h-11">
            Save
          </Button>
          {member.pending && (
            <div className="flex flex-col gap-1.5 border-t pt-4">
              <span className="text-sm font-medium">Invite link</span>
              <CopyField value={`https://errors.demo-co.example/accept/${member.id}/d1x9-3f0a7c2be41d5a6f8b90/`} label="Invite link" />
            </div>
          )}
          {myRole === OrgRole.owner && !member.pending && member.id !== ME && <DangerRow label="Make this member the owner" action={<Button className="max-lg:h-11">Transfer ownership</Button>} />}
          {member.id !== ME && (
            <DangerRow
              label={member.pending ? 'Cancel this invite' : 'Remove from the organization'}
              action={
                <Button variant="destructive" className="max-lg:h-11">
                  {member.pending ? 'Cancel invite' : 'Remove'}
                </Button>
              }
            />
          )}
        </>
      ) : (
        <dl className="flex gap-8">
          <Fact label="Role" value={roleLabel(member.role)} />
          <Fact label="Teams" value={member.teams.map((team) => `#${team}`).join('  ') || 'None'} mono />
        </dl>
      )}
    </Pane>
  )
}

/* ---------- teams ---------- */

const teamProjects = (slug: string) => PROJECTS.filter((project) => project.teams.some((team) => team.slug === slug))
const teamMembers = (slug: string) => MEMBERS.filter((member) => member.teams.includes(slug))

function Teams({ org }: { org: string }) {
  const { can } = useProto()
  const groups = [
    { label: 'Your teams', teams: TEAMS.filter((team) => team.isMember) },
    { label: 'Other teams', teams: TEAMS.filter((team) => !team.isMember) },
  ]
  return (
    <>
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="label-caps flex h-8 items-center border-b bg-muted px-3 md:px-6">{group.label}</h2>
          <ul>
            {group.teams.map((team) => (
              <li key={team.slug} className="relative flex min-h-14 items-center gap-4 border-b px-3 hover:bg-accent md:px-6">
                <PLink to={`/${org}/settings/teams/${team.slug}/members`} className="absolute inset-0" aria-label={`Team ${team.slug}`}>
                  {null}
                </PLink>
                <div className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-center lg:gap-4">
                  <span className="mono w-40 truncate font-medium text-foreground">#{team.slug}</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="mono">{team.memberCount}</span> members · <span className="mono">{teamProjects(team.slug).length}</span> projects
                  </span>
                </div>
                {(team.isMember || ORG.openMembership || can('org:write')) && (
                  <Button size="sm" className="relative z-10 max-lg:h-9">
                    {team.isMember ? 'Leave' : 'Join'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function Tabs({ tabs }: { tabs: { label: string; to: string; tab?: string; current: boolean; count?: number }[] }) {
  return (
    <div className="flex gap-5 overflow-x-auto border-b px-3 md:px-6" role="tablist">
      {tabs.map((tab) => (
        <PLink
          key={tab.label}
          to={tab.to}
          search={tab.tab ? { tab: tab.tab } : undefined}
          role="tab"
          aria-selected={tab.current}
          className={cn('flex h-10 items-center gap-1.5 border-y-2 border-transparent text-sm font-medium whitespace-nowrap max-lg:h-11', tab.current ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}
        >
          {tab.label}
          {tab.count !== undefined && <span className="mono text-muted-foreground">{tab.count}</span>}
        </PLink>
      ))}
    </div>
  )
}

function TeamPage({ org, slug, tab }: { org: string; slug: string; tab: 'members' | 'projects' | 'settings' }) {
  const { can } = useProto()
  const base = `/${org}/settings/teams/${slug}`
  const members = teamMembers(slug)
  const projects = teamProjects(slug)
  const [deleting, setDeleting] = useState(false)
  return (
    <>
      <Tabs
        tabs={[
          { label: 'Members', to: `${base}/members`, current: tab === 'members', count: members.length },
          { label: 'Projects', to: `${base}/projects`, current: tab === 'projects', count: projects.length },
          { label: 'Settings', to: `${base}/settings`, current: tab === 'settings' },
        ]}
      />
      {tab === 'members' && (
        <>
          {can('team:write') && (
            <div className="flex items-center gap-2 border-b px-3 py-3 md:px-6">
              <Select className="max-w-xs" defaultValue="" aria-label="Add member">
                <option value="" disabled>
                  Add a member
                </option>
                {MEMBERS.filter((member) => !member.teams.includes(slug)).map((member) => (
                  <option key={member.id}>{member.email}</option>
                ))}
              </Select>
            </div>
          )}
          <ul>
            {members.map((member) => (
              <li key={member.id} className="relative flex min-h-12 items-center gap-3 border-b px-3 hover:bg-accent md:px-6">
                <PLink to={`/${org}/settings/members/${member.id}`} className="absolute inset-0" aria-label={member.email}>
                  {null}
                </PLink>
                <Initials member={member} />
                <span className="min-w-0 flex-1 truncate">{member.user?.name || member.email}</span>
                <span className="text-sm text-muted-foreground max-lg:hidden">{roleLabel(member.role)}</span>
                {can('team:write') && (
                  <Button size="sm" variant="ghost" className="relative z-10 max-lg:h-11">
                    {member.id === ME ? 'Leave' : 'Remove'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === 'projects' && (
        <>
          {can('team:write') && (
            <div className="flex items-center gap-2 border-b px-3 py-3 md:px-6">
              <Select className="max-w-xs" defaultValue="" aria-label="Add project">
                <option value="" disabled>
                  Add a project
                </option>
                {PROJECTS.filter((project) => !projects.includes(project)).map((project) => (
                  <option key={project.id}>{project.slug}</option>
                ))}
              </Select>
            </div>
          )}
          <ul>
            {projects.map((project) => (
              <li key={project.id} className="relative flex min-h-12 items-center gap-3 border-b px-3 hover:bg-accent md:px-6">
                <PLink to={`/${org}/settings/projects/${project.slug}`} className="absolute inset-0" aria-label={project.name}>
                  {null}
                </PLink>
                <span className="mono min-w-0 flex-1 truncate font-medium">{project.slug}</span>
                <span className="text-sm text-muted-foreground">{platformName(project.platform)}</span>
                {can('team:write') && (
                  <Button size="sm" variant="ghost" className="relative z-10 max-lg:h-11">
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === 'settings' && (
        <Pane>
          <Field label="Slug">
            <Input defaultValue={slug} className="font-mono" disabled={!can('team:write')} maxLength={50} />
          </Field>
          {can('team:write') && (
            <Button variant="default" className="self-start max-lg:h-11">
              Save
            </Button>
          )}
          {can('team:admin') && (
            <DangerRow
              label="Delete this team"
              action={
                <Button variant="destructive" className="max-lg:h-11" onClick={() => setDeleting(true)}>
                  Delete
                </Button>
              }
            />
          )}
          <DeleteDialog open={deleting} onClose={() => setDeleting(false)} what="team" name={slug} loses={`${members.length} members lose the access this team gives them to ${projects.length} projects.`} />
        </Pane>
      )}
    </>
  )
}

/* ---------- project ---------- */

function ProjectPage({ org, slug }: { org: string; slug: string }) {
  const { search } = useProto()
  const project = PROJECTS.find((p) => p.slug === slug) ?? PROJECTS[0]!
  const base = `/${org}/settings/projects/${slug}`
  const tab = search.tab ?? 'general'
  return (
    <>
      <Tabs
        tabs={[
          { label: 'General', to: base, current: tab === 'general' },
          { label: 'Client keys', to: base, tab: 'dsn', current: tab === 'dsn', count: KEYS.length },
          { label: 'Environments', to: base, tab: 'environments', current: tab === 'environments', count: ENVIRONMENTS.length },
          { label: 'Alerts', to: base, tab: 'alerts', current: tab === 'alerts', count: ALERT_COUNT },
        ]}
      />
      {tab === 'general' && <ProjectGeneral slug={slug} />}
      {tab === 'dsn' && <ProjectKeys fresh={!project.firstEvent} platform={project.platform} />}
      {tab === 'environments' && <ProjectEnvironments />}
      {tab === 'alerts' && (
        <ul className="max-w-2xl">
          {[
            ['Error burst', '10 events in 1 minute · email, Slack'],
            ['Uptime', 'A check fails · email'],
          ].map(([name, summary]) => (
            <li key={name} className="flex min-h-12 cursor-pointer items-center gap-3 border-b px-3 hover:bg-accent md:px-6">
              <span className="w-28 shrink-0 font-medium">{name}</span>
              <span className="min-w-0 truncate text-muted-foreground">{summary}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ProjectGeneral({ slug }: { slug: string }) {
  const { can } = useProto()
  const project = PROJECTS.find((p) => p.slug === slug) ?? PROJECTS[0]!
  const [teams, setTeams] = useState(project.teams.map((team) => team.slug))
  const [deleting, setDeleting] = useState(false)
  const write = can('project:write')
  return (
    <Pane>
      <Field label="Name">
        <Input defaultValue={project.name} disabled={!write} maxLength={64} />
      </Field>
      <Field label="Platform">
        <Select defaultValue={project.platform ?? 'other'} disabled={!write}>
          {PLATFORMS.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Teams with access</span>
        <div className="flex flex-wrap items-center gap-2">
          {teams.map((team) => (
            <span key={team} className="mono flex h-8 items-center border bg-card pl-2.5 max-lg:h-11">
              #{team}
              {write && (
                <button type="button" className="grid size-8 place-items-center text-muted-foreground hover:text-foreground max-lg:size-11" aria-label={`Remove ${team}`} onClick={() => setTeams(teams.filter((t) => t !== team))}>
                  <X className="size-3.5" />
                </button>
              )}
              {!write && <span className="w-2.5" />}
            </span>
          ))}
          {write && teams.length < TEAMS.length && (
            <Select className="w-auto" value="" aria-label="Add team" onChange={(event) => setTeams([...teams, event.target.value])}>
              <option value="" disabled>
                Add a team
              </option>
              {TEAMS.filter((team) => !teams.includes(team.slug)).map((team) => (
                <option key={team.slug} value={team.slug}>
                  #{team.slug}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>
      <Field label="Events to drop (%)" className="max-w-40">
        <Input defaultValue={project.eventThrottleRate} disabled={!write} inputMode="numeric" className="font-mono" />
      </Field>
      <dl className="flex gap-8">
        <Fact label="IP addresses" value={project.scrubIPAddresses ? 'Not stored' : 'Stored'} />
        <Fact label="Created" value={dateText(project.dateCreated)} mono />
      </dl>
      {write && (
        <Button variant="default" className="self-start max-lg:h-11">
          Save
        </Button>
      )}
      {can('project:admin') && (
        <DangerRow
          label="Delete this project"
          action={
            <Button variant="destructive" className="max-lg:h-11" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          }
        />
      )}
      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} what="project" name={project.slug ?? ''} loses="Its issues, events, client keys and alerts are deleted for good." />
    </Pane>
  )
}

function ProjectKeys({ fresh, platform }: { fresh: boolean; platform: string | null | undefined }) {
  const { can, search } = useProto()
  const [editing, setEditing] = useState<string | null>(search.open === 'key' ? KEYS[1]!.id : null)
  const [open, setOpen] = useState<string | null>(null)
  const write = can('project:write')
  return (
    <Pane className="max-w-3xl">
      {fresh && (
        <>
          <FirstEvent arrived={false} />
          <Snippets platform={platformOf(platform)} dsn={KEYS[0]!.dsn.public!} />
        </>
      )}
      {KEYS.map((key) => (
        <section key={key.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-medium">{key.name}</h2>
            <span className="mono text-muted-foreground">{rateLimitText(key)}</span>
            <span className="mono ml-auto text-muted-foreground max-lg:hidden">{dateText(key.dateCreated)}</span>
            {write && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="max-lg:ml-auto max-lg:size-11" aria-label={`Actions for ${key.name}`}>
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing(key.id)}>Rename or limit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setOpen(open === key.id ? null : key.id)}>Security report address</DropdownMenuItem>
                  <DropdownMenuItem destructive>Delete key</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <CopyField value={key.dsn.public!} label={`DSN for ${key.name}`} />
          {open === key.id && (
            <Field label="Security report address">
              <CopyField value={key.dsn.security!} label="Security report address" />
            </Field>
          )}
        </section>
      ))}
      {write && (
        <Button className="self-start max-lg:h-11" onClick={() => setEditing('new')}>
          <Plus />
          New key
        </Button>
      )}
      {editing && <KeyDialog open onClose={() => setEditing(null)} keyItem={KEYS.find((key) => key.id === editing)} />}
    </Pane>
  )
}

function ProjectEnvironments() {
  const { can } = useProto()
  const [hidden, setHidden] = useState(() => new Set(ENVIRONMENTS.filter((e) => e.isHidden).map((e) => e.name)))
  return (
    <ul className="max-w-2xl">
      {ENVIRONMENTS.map((environment) => (
        <li key={environment.name} className="flex min-h-12 items-center justify-between gap-3 border-b px-3 md:px-6">
          <span className={cn('mono', hidden.has(environment.name) && 'text-muted-foreground line-through')}>{environment.name}</span>
          {can('project:write') ? (
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
  )
}

/* ---------- new project: step 1 choose, step 2 install ---------- */

function Steps({ at }: { at: 1 | 2 }) {
  const steps = ['Platform and name', 'Install', 'First event']
  return (
    <ol className="flex items-center gap-3 text-sm">
      {steps.map((step, index) => (
        <li key={step} className={cn('flex items-center gap-2', index + 1 === at ? 'font-semibold' : 'text-muted-foreground', index > at - 1 && 'max-lg:hidden')}>
          <span className={cn('mono grid size-5 place-items-center border text-xs', index + 1 === at && 'border-foreground bg-foreground text-background')}>{index + 1}</span>
          {step}
          {index < steps.length - 1 && <span className="ml-1 h-px w-6 bg-border max-lg:hidden" />}
        </li>
      ))}
    </ol>
  )
}

function NewProject({ org }: { org: string }) {
  const { search } = useProto()
  const go = useGo()
  const [platform, setPlatform] = useState('javascript-react')
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState(TEAMS[0]!.slug)
  const base = `/${org}/settings/projects`

  if (search.created) {
    const chosen = platformOf(search.tab) ?? platformOf('go')
    return (
      <Pane className="max-w-3xl">
        <Steps at={2} />
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold">
            Add {chosen?.name} to <span className="font-mono text-lg">{search.created}</span>
          </h1>
          <PLink to={`${base}/new`} className="text-sm font-medium whitespace-nowrap text-brand hover:underline">
            Change platform
          </PLink>
        </div>
        <Snippets platform={chosen} dsn={KEYS[0]!.dsn.public!} />
        <FirstEvent arrived={false} />
        <div className="flex gap-2">
          <Button asChild className="max-lg:h-11 max-lg:flex-1">
            <PLink to={`${base}/${search.created}`}>Project settings</PLink>
          </Button>
          <Button asChild className="max-lg:h-11 max-lg:flex-1">
            <PLink to="/">Finish later</PLink>
          </Button>
        </div>
      </Pane>
    )
  }

  const shown = PLATFORMS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  const groups = [...new Set(shown.map((p) => p.group))]
  return (
    <Pane className="max-w-3xl">
      <Steps at={1} />
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a platform" aria-label="Find a platform" className="pl-8" />
        </div>
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-1.5">
            <h2 className="label-caps">{group}</h2>
            <div className="grid grid-cols-2 border-t border-l sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label={group}>
              {shown
                .filter((p) => p.group === group)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={p.id === platform}
                    onClick={() => setPlatform(p.id)}
                    className={cn('flex h-10 items-center border-r border-b px-3 text-left text-sm font-medium max-lg:h-11', p.id === platform ? 'bg-foreground text-background' : 'bg-card hover:bg-accent')}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-muted-foreground">No platform matches. Choose Other to get the DSN alone.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name">
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={64} />
        </Field>
        <Field label="Team">
          <Select value={team} onChange={(event) => setTeam(event.target.value)}>
            {TEAMS.map((t) => (
              <option key={t.slug} value={t.slug}>
                #{t.slug}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button variant="default" className="self-start max-lg:h-11 max-lg:self-stretch" disabled={!name.trim()} onClick={() => go(`${base}/new`, { created: name.trim().toLowerCase().replace(/\s+/g, '-'), tab: platform })}>
        Create project
      </Button>
    </Pane>
  )
}

