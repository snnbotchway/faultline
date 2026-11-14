import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { OrgRole, type Member } from '@/api/members'
import { Scope, membersQuery, organizationQuery, projectsQuery, teamsQuery } from '@/api/organizations'
import { projectActions, type Project } from '@/api/projects'
import { TEAM_SLUG_MAX, teamActions, teamMembersQuery, type Team } from '@/api/teams'
import { stale } from '@/api/stale'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { Failure, useAccess, useChange, useOwnMember } from './access'
import { Confirm } from './fields'
import { Field, FoldRow, FormDialog, Initials, RowSkeleton, SettingsBar, Sheet, Tag } from './parts'
import { atLeast } from './roles'
import { plural } from '@/lib/text'
import { memberName, projectHasTeam, teamLabel } from './labels'
import { teamSlugError } from './team-slug'
import { TeamTab } from './team-tabs'

/**
 * Whether the user may put someone on this team or take them off it, by the backend's rule: anyone may join or
 * leave when membership is open; otherwise it takes an admin on a team they are on, or a manager on any other.
 */
function canChangeMembership(me: Member | undefined, team: Team, openMembership: boolean, memberId: string) {
  if (!me) return false
  if (openMembership && memberId === me.id) return true
  return atLeast(me.role, team.isMember ? OrgRole.admin : OrgRole.manager)
}

/**
 * The organization's teams. A row unfolds to show who is on the team and which projects it opens.
 * The stock paths `/teams/:team/members`, `/projects` and `/settings` are this page with that row unfolded.
 */
export function Teams({ org, openSlug }: { org: string; openSlug?: string }) {
  useTitle('Teams', org)
  const can = useAccess(org)
  const navigate = useNavigate()
  const teams = useQuery(teamsQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data ?? []
  const organization = useQuery(organizationQuery(org)).data
  const me = useOwnMember(org)
  const [creating, setCreating] = useState(false)
  const write = can(Scope.teamWrite)
  const open = (slug?: string) =>
    void navigate(slug ? { to: '/$org/settings/teams/$team/$tab', params: { org, team: slug, tab: TeamTab.members }, replace: true } : { to: '/$org/settings/teams', params: { org }, replace: true })
  const create = write && (
    <Button variant="default" size="bar" onClick={() => setCreating(true)}>
      <Plus />
      New team
    </Button>
  )
  return (
    <>
      <SettingsBar org={org} title="Teams">
        {teams && teams.length > 0 && create}
      </SettingsBar>
      <Sheet>
        {!teams ? (
          <RowSkeleton />
        ) : teams.length === 0 ? (
          <Screen title="No teams yet">{create}</Screen>
        ) : (
          <ul>
            {teams.map((team) => (
              <TeamRow
                key={team.slug}
                org={org}
                team={team}
                taken={teams.map((t) => t.slug)}
                projects={projects}
                me={me}
                write={write}
                admin={can(Scope.teamAdmin)}
                linkProjects={can(Scope.orgWrite)}
                canChange={(memberId) => canChangeMembership(me, team, !!organization?.openMembership, memberId)}
                open={team.slug === openSlug}
                onOpen={open}
              />
            ))}
          </ul>
        )}
      </Sheet>
      {creating && teams && <SlugDialog org={org} taken={teams.map((team) => team.slug)} onClose={() => setCreating(false)} onDone={(team) => open(team.slug)} />}
    </>
  )
}

type RowProps = {
  org: string
  team: Team
  taken: string[]
  projects: Project[]
  me?: Member
  write: boolean
  admin: boolean
  // Adding a project to a team, or taking it off, is for managers and owners.
  linkProjects: boolean
  canChange: (memberId: string) => boolean
  open: boolean
  onOpen: (slug?: string) => void
}

function TeamRow(props: RowProps) {
  const { org, team, projects, me, canChange, open, onOpen } = props
  const opens = projects.filter((project) => projectHasTeam(project, team.slug))
  const membership = useChange(team.isMember ? 'leave the team' : 'join the team', () => (team.isMember ? teamActions.removeMember(org, team.slug, me!.id) : teamActions.addMember(org, team.slug, me!.id)), {
    // Being on a team changes which projects the user is a member of.
    stale: [stale.teams(org), stale.projects(org)],
    failure: Failure.asNotice,
  })
  return (
    <li className={cn(open && 'bg-card')}>
      <div className={cn('relative flex min-h-14 items-center gap-3 border-b px-3 hover:bg-accent md:px-4', open && 'border-b-0')}>
        <button type="button" aria-expanded={open} onClick={() => onOpen(open ? undefined : team.slug)} className="absolute inset-0 -outline-offset-2" aria-label={`Team ${team.slug}`} />
        <span className="flex min-w-0 flex-1 flex-col py-2 lg:flex-row lg:items-center lg:gap-3">
          <span className="mono font-medium break-words lg:w-52 lg:shrink-0">{teamLabel(team.slug)}</span>
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {plural(team.memberCount, 'member')} · {plural(opens.length, 'project')}
          </span>
        </span>
        {me && canChange(me.id) && (
          <Button className="relative z-10 w-16" disabled={membership.pending} aria-busy={membership.pending} onClick={() => membership.run()}>
            {team.isMember ? 'Leave' : 'Join'}
          </Button>
        )}
        <FoldRow.Chevron open={open} />
      </div>
      {open && <TeamDetail {...props} opens={opens} />}
    </li>
  )
}

const DETAIL_ROW = 'flex min-h-10 items-center gap-2 border-b max-lg:min-h-11'

function TeamDetail({ org, team, taken, projects, opens, me, write, admin, linkProjects, canChange, onOpen }: RowProps & { opens: Project[] }) {
  const roster = useQuery(teamMembersQuery(org, team.slug)).data
  const everyone = useQuery(membersQuery(org)).data ?? []
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const onRoster = { stale: [stale.teams(org)], failure: Failure.asNotice }
  const onAccess = { stale: [stale.teams(org), stale.projects(org)], failure: Failure.asNotice }
  const addMember = useChange('add the member', (id: string) => teamActions.addMember(org, team.slug, id), onRoster)
  const removeMember = useChange('remove the member', (id: string) => teamActions.removeMember(org, team.slug, id), onRoster)
  const addProject = useChange('add the project', (slug: string) => projectActions.addTeam(org, slug, team.slug), onAccess)
  const removeProject = useChange('remove the project', (slug: string) => projectActions.removeTeam(org, slug, team.slug), onAccess)
  const remove = useChange('delete the team', () => teamActions.remove(org, team.slug), { stale: [stale.teams(org), stale.projects(org)], leavesPage: true, onDone: () => onOpen() })
  const outside = everyone.filter((member) => member.id !== me?.id && !roster?.some((m) => m.id === member.id) && canChange(member.id))
  const closed = projects.filter((project) => !opens.includes(project))
  return (
    <div className="grid gap-x-8 gap-y-4 border-b px-3 pt-1 pb-4 md:px-4 lg:grid-cols-2">
      <section aria-label={`Members of ${team.slug}`}>
        <h3 className="label-caps border-b pb-2">Members</h3>
        {!roster && <RowSkeleton rows={2} />}
        {roster?.length === 0 && <p className={cn(DETAIL_ROW, 'text-muted-foreground')}>Nobody yet</p>}
        {roster?.map((member) => (
          <div key={member.id} className={DETAIL_ROW}>
            <Initials name={memberName(member)} hollow={member.pending} />
            <Link to="/$org/settings/members/$memberId" params={{ org, memberId: member.id }} className="min-w-0 flex-1 py-1 [overflow-wrap:anywhere] hover:underline">
              {memberName(member)}
            </Link>
            {/* The user's own way out is the Leave button on the row above; it is not offered twice. */}
            {member.id === me?.id ? (
              <Tag>You</Tag>
            ) : (
              canChange(member.id) && (
                <Button variant="ghost" disabled={removeMember.pending} onClick={() => removeMember.run(member.id)}>
                  Remove
                </Button>
              )
            )}
          </div>
        ))}
        {outside.length > 0 && (
          <Select value="" aria-label={`Add a member to ${team.slug}`} className="mt-2" disabled={addMember.pending} onChange={(event) => addMember.run(event.target.value)}>
            <option value="" disabled>
              Add a member
            </option>
            {outside.map((member) => (
              <option key={member.id} value={member.id}>
                {member.user?.name ? `${member.user.name} (${member.email})` : member.email}
              </option>
            ))}
          </Select>
        )}
      </section>
      <section aria-label={`Projects of ${team.slug}`}>
        <h3 className="label-caps border-b pb-2">Projects</h3>
        {opens.length === 0 && <p className={cn(DETAIL_ROW, 'text-muted-foreground')}>None yet</p>}
        {opens.map((project) => (
          <div key={project.id} className={DETAIL_ROW}>
            <Link to="/$org/settings/projects/$project" params={{ org, project: project.slug ?? '' }} className="mono min-w-0 flex-1 py-1 break-words hover:underline">
              {project.slug}
            </Link>
            {linkProjects && (
              <Button variant="ghost" disabled={removeProject.pending} onClick={() => removeProject.run(project.slug ?? '')}>
                Remove
              </Button>
            )}
          </div>
        ))}
        {linkProjects && closed.length > 0 && (
          <Select value="" aria-label={`Add a project to ${team.slug}`} className="mt-2" disabled={addProject.pending} onChange={(event) => addProject.run(event.target.value)}>
            <option value="" disabled>
              Add a project
            </option>
            {closed.map((project) => (
              <option key={project.id} value={project.slug ?? ''}>
                {project.slug}
              </option>
            ))}
          </Select>
        )}
      </section>
      {write && (
        <div className="flex gap-2 lg:col-span-2">
          <Button onClick={() => setRenaming(true)}>
            Rename
          </Button>
          {admin && (
            <Button variant="destructive" onClick={() => setDeleting(true)}>
              Delete team
            </Button>
          )}
        </div>
      )}
      {renaming && <SlugDialog org={org} team={team.slug} taken={taken.filter((slug) => slug !== team.slug)} onClose={() => setRenaming(false)} onDone={(renamed) => onOpen(renamed.slug)} />}
      <Confirm
        open={deleting}
        onClose={() => {
          setDeleting(false)
          remove.clear()
        }}
        title={`Delete #${team.slug}?`}
        confirm="Delete team"
        destructive
        onConfirm={() => remove.run()}
        pending={remove.pending}
        error={remove.error}
      >
        {opens.length > 0 && `Its members lose the access it gave them to ${plural(opens.length, 'project')}. The projects stay.`}
      </Confirm>
    </div>
  )
}

// A team is only its name, so creating one and renaming one are the same short form.
function SlugDialog({ org, team, taken, onClose, onDone }: { org: string; team?: string; taken: string[]; onClose: () => void; onDone: (team: Team) => void }) {
  const [slug, setSlug] = useState(team ?? '')
  const [checked, setChecked] = useState(false)
  const problem = teamSlugError(slug, taken)
  const save = useChange(team ? 'rename the team' : 'create the team', () => (team ? teamActions.rename(org, team, slug.trim()) : teamActions.create(org, slug.trim())), {
    stale: [stale.teams(org), stale.projects(org)],
    onDone: (saved) => {
      onClose()
      onDone(saved)
    },
  })
  const submit = () => {
    setChecked(true)
    if (!problem) save.run()
  }
  return (
    <FormDialog open onClose={onClose} title={team ? `Rename #${team}` : 'New team'} submit={team ? 'Rename' : 'Create team'} onSubmit={submit} pending={save.pending} error={save.error} disabled={slug.trim() === team}>
      <Field label="Name" error={checked ? problem : undefined}>
        {(field) => (
          <Input {...field} autoFocus value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={TEAM_SLUG_MAX} className="font-mono" autoComplete="off" autoCapitalize="off" spellCheck={false} />
        )}
      </Field>
    </FormDialog>
  )
}
