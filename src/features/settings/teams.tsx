import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { type Member } from '@/api/members'
import { Scope, membersQuery, organizationQuery, projectsQuery, teamsQuery } from '@/api/organizations'
import { projectActions, type Project } from '@/api/projects'
import { TEAM_SLUG_MAX, teamActions, teamMembersQuery, type Team } from '@/api/teams'
import { stale } from '@/api/stale'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { RowButton } from '@/components/ui/row-button'
import { Tag } from '@/components/ui/tag'
import { Input, Select } from '@/components/ui/input'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { useAccess, useOwnMember } from './access'
import { useChange } from './change'
import { Confirm } from './fields'
import { Field } from '@/components/ui/field'
import { FoldChevron, FormDialog, Initials, RowSkeleton, SettingsBar, Sheet } from './parts'
import { notify } from '@/lib/notice'
import { messages, useT } from '@/i18n'
import { memberName, projectHasTeam, teamLabel } from './labels'
import { teamSlugError } from './team-slug'
import { TeamTab } from './team-tabs'

/**
 * Whether the user may put someone on this team or take them off it, by the backend's rule: anyone may join or
 * leave when membership is open; otherwise it takes an admin on a team they are on, or a manager on any other.
 * Team scopes start at admin, and only a manager's role adds `member:write`, which is what tells the two apart.
 */
function canChangeMembership(me: Member | undefined, can: (scope: Scope) => boolean, team: Team, openMembership: boolean, memberId: string) {
  if (!me) return false
  if (openMembership && memberId === me.id) return true
  return can(team.isMember ? Scope.teamWrite : Scope.memberWrite)
}

/**
 * The organization's teams. A row unfolds to show who is on the team and which projects it opens.
 * The stock paths `/teams/:team/members`, `/projects` and `/settings` are this page with that row unfolded.
 */
export function Teams({ org, openSlug }: { org: string; openSlug?: string }) {
  const t = useT().settings
  useTitle(t.teams, org)
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
      {t.teamsPage.newTeam}
    </Button>
  )
  return (
    <>
      <SettingsBar org={org} title={t.teams}>
        {teams && teams.length > 0 && create}
      </SettingsBar>
      <Sheet>
        {!teams ? (
          <RowSkeleton />
        ) : teams.length === 0 ? (
          <Screen title={t.teamsPage.none}>{create}</Screen>
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
                canChange={(memberId) => canChangeMembership(me, can, team, !!organization?.openMembership, memberId)}
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
  const { settings: t, common } = useT()
  const membership = useChange(team.isMember ? t.teamsPage.leaveAction : t.teamsPage.joinAction, () => (team.isMember ? teamActions.removeMember(org, team.slug, me!.id) : teamActions.addMember(org, team.slug, me!.id)), {
    // Being on a team changes which projects the user is a member of.
    stale: [stale.teams(org), stale.projects(org)],
    notice: true,
  })
  return (
    <li className={cn(open && 'bg-card')}>
      <div className={cn('relative flex min-h-14 items-center gap-3 border-b px-3 hover:bg-accent md:px-4', open && 'border-b-0')}>
        <button type="button" aria-expanded={open} onClick={() => onOpen(open ? undefined : team.slug)} className="absolute inset-0 -outline-offset-2" aria-label={t.teamsPage.team(team.slug)} />
        <span className="flex min-w-0 flex-1 flex-col py-2 lg:flex-row lg:items-center lg:gap-3">
          <span className="mono font-medium break-words lg:w-52 lg:shrink-0">{teamLabel(team.slug)}</span>
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {common.members(team.memberCount)} · {common.projects(opens.length)}
          </span>
        </span>
        {me && canChange(me.id) && (
          <RowButton className="relative z-10" disabled={membership.pending} aria-busy={membership.pending} onClick={() => membership.run()}>
            {team.isMember ? t.teamsPage.leave : t.teamsPage.join}
          </RowButton>
        )}
        <FoldChevron open={open} />
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
  const [unlinking, setUnlinking] = useState<string>()
  const { settings: t, common } = useT()
  const text = t.teamsPage
  const onRoster = { stale: [stale.teams(org)], notice: true }
  const onAccess = { stale: [stale.teams(org), stale.projects(org)], notice: true }
  const addMember = useChange(text.addMemberAction, (id: string) => teamActions.addMember(org, team.slug, id), onRoster)
  // A team membership carries nothing but itself, so adding the member back undoes the removal exactly.
  const removeMember = useChange(text.removeMemberAction, (member: Member) => teamActions.removeMember(org, team.slug, member.id), {
    ...onRoster,
    onDone: (_, member) => {
      const words = messages().settings.teamsPage
      notify(words.removed(memberName(member), team.slug), false, { label: words.undo, run: () => addMember.run(member.id) })
    },
  })
  const addProject = useChange(text.addProjectAction, (slug: string) => projectActions.addTeam(org, slug, team.slug), onAccess)
  const removeProject = useChange(text.removeProjectAction, (slug: string) => projectActions.removeTeam(org, slug, team.slug), {
    stale: onAccess.stale,
    onDone: () => setUnlinking(undefined),
  })
  const remove = useChange(text.deleteAction, () => teamActions.remove(org, team.slug), { stale: [stale.teams(org), stale.projects(org)], leavesPage: true, onDone: () => onOpen() })
  const outside = everyone.filter((member) => member.id !== me?.id && !roster?.some((m) => m.id === member.id) && canChange(member.id))
  const closed = projects.filter((project) => !opens.includes(project))
  return (
    <div className="grid gap-x-8 gap-y-4 border-b px-3 pt-1 pb-4 md:px-4 lg:grid-cols-2">
      <section aria-label={text.membersOf(team.slug)}>
        <h2 className="label-caps border-b pb-2">{t.members}</h2>
        {!roster && <RowSkeleton rows={2} />}
        {roster?.length === 0 && <p className={cn(DETAIL_ROW, 'text-muted-foreground')}>{text.nobody}</p>}
        {roster?.map((member) => (
          <div key={member.id} className={DETAIL_ROW}>
            <Initials name={memberName(member)} hollow={member.pending} />
            <Link to="/$org/settings/members/$memberId" params={{ org, memberId: member.id }} className="min-w-0 flex-1 py-1 [overflow-wrap:anywhere] hover:underline">
              {memberName(member)}
            </Link>
            {/* The user's own way out is the Leave button on the row above; it is not offered twice. */}
            {member.id === me?.id ? (
              <Tag>{common.you}</Tag>
            ) : (
              canChange(member.id) && (
                <RowButton danger disabled={removeMember.pending} onClick={() => removeMember.run(member)}>
                  {common.remove}
                </RowButton>
              )
            )}
          </div>
        ))}
        {outside.length > 0 && (
          <Select value="" aria-label={text.addMemberTo(team.slug)} className="mt-2" disabled={addMember.pending} onChange={(event) => addMember.run(event.target.value)}>
            <option value="" disabled>
              {text.addMember}
            </option>
            {outside.map((member) => (
              <option key={member.id} value={member.id}>
                {member.user?.name ? `${member.user.name} (${member.email})` : member.email}
              </option>
            ))}
          </Select>
        )}
      </section>
      <section aria-label={text.projectsOf(team.slug)}>
        <h2 className="label-caps border-b pb-2">{t.projects}</h2>
        {opens.length === 0 && <p className={cn(DETAIL_ROW, 'text-muted-foreground')}>{common.noneYet}</p>}
        {opens.map((project) => (
          <div key={project.id} className={DETAIL_ROW}>
            <Link to="/$org/settings/projects/$project" params={{ org, project: project.slug ?? '' }} className="mono min-w-0 flex-1 py-1 break-words hover:underline">
              {project.slug}
            </Link>
            {linkProjects && (
              <RowButton danger onClick={() => setUnlinking(project.slug ?? '')}>
                {common.remove}
              </RowButton>
            )}
          </div>
        ))}
        {linkProjects && closed.length > 0 && (
          <Select value="" aria-label={text.addProjectTo(team.slug)} className="mt-2" disabled={addProject.pending} onChange={(event) => addProject.run(event.target.value)}>
            <option value="" disabled>
              {text.addProject}
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
          <Button onClick={() => setRenaming(true)}>{text.rename}</Button>
          {admin && (
            <Button variant="destructive" onClick={() => setDeleting(true)}>
              {text.delete}
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
        title={text.deleteTitle(team.slug)}
        confirm={text.delete}
        destructive
        onConfirm={() => remove.run()}
        pending={remove.pending}
        error={remove.error}
      >
        {opens.length > 0 && text.loseAccess(opens.length)}
      </Confirm>
      <Confirm
        open={!!unlinking}
        onClose={() => {
          setUnlinking(undefined)
          removeProject.clear()
        }}
        title={text.removeProjectTitle(unlinking ?? '', team.slug)}
        confirm={text.removeProject}
        destructive
        onConfirm={() => unlinking && removeProject.run(unlinking)}
        pending={removeProject.pending}
        error={removeProject.error}
      >
        {text.loseProject(unlinking ?? '')}
      </Confirm>
    </div>
  )
}

// A team is only its name, so creating one and renaming one are the same short form.
function SlugDialog({ org, team, taken, onClose, onDone }: { org: string; team?: string; taken: string[]; onClose: () => void; onDone: (team: Team) => void }) {
  const [slug, setSlug] = useState(team ?? '')
  const [checked, setChecked] = useState(false)
  const problem = teamSlugError(slug, taken)
  const t = useT().settings
  const text = t.teamsPage
  const save = useChange(team ? text.renameAction : text.createAction, () => (team ? teamActions.rename(org, team, slug.trim()) : teamActions.create(org, slug.trim())), {
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
    <FormDialog open onClose={onClose} title={team ? text.renameTitle(team) : text.newTeam} submit={team ? text.rename : text.create} onSubmit={submit} pending={save.pending} error={save.error} disabled={slug.trim() === team}>
      <Field label={t.name} error={checked ? problem : undefined}>
        {(field) => (
          <Input {...field} autoFocus value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={TEAM_SLUG_MAX} className="font-mono" autoComplete="off" autoCapitalize="off" spellCheck={false} />
        )}
      </Field>
    </FormDialog>
  )
}
