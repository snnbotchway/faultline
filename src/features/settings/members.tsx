import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { OrgRole, memberActions, type Member } from '@/api/members'
import { Feature, Scope, instanceSettingsQuery, membersQuery, projectsQuery, teamsQuery } from '@/api/organizations'
import type { Project } from '@/api/projects'
import { teamActions, teamMembersQuery, type Team } from '@/api/teams'
import { stale } from '@/api/stale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ago, exact } from '@/features/issues/format'
import { failed, notify } from '@/lib/notice'
import { hasWords, searchWords } from '@/lib/text'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { Failure, useAccess, useChange, useOwnMember } from './access'
import { Confirm, RoleField, TeamChecklist } from './fields'
import { InviteDialog } from './invite-dialog'
import { CopyButton, FoldRow, FormError, Initials, RowSkeleton, SettingsBar, Sheet, Tag } from './parts'
import { memberName, teamList } from './labels'
import { ROLE_LABEL } from './roles'

/**
 * Who is in the organization and who has been invited. Someone who may change members unfolds a row to do it;
 * everyone else sees a plain list. `/members/new` is this page with the invite dialog open, `/members/:id` with
 * that row unfolded.
 */
export function Members({ org, openId, inviting }: { org: string; openId?: string; inviting: boolean }) {
  useTitle('Members', org)
  const can = useAccess(org)
  const navigate = useNavigate()
  const members = useQuery(membersQuery(org)).data
  const teams = useQuery(teamsQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data ?? []
  const emailOn = useQuery(instanceSettingsQuery).data?.enabledFeatures.includes(Feature.email) ?? false
  const me = useOwnMember(org)
  const [query, setQuery] = useState('')

  // The member list does not say who is on which team; each team's own list does.
  const rosters = useQueries({ queries: (teams ?? []).map((team) => teamMembersQuery(org, team.slug)) })
  const teamsLoaded = !!teams && rosters.every((roster) => roster.data)
  const teamsOf = (member: Member) => (teams ?? []).filter((_, index) => rosters[index]?.data?.some((m) => m.id === member.id)).map((team) => team.slug)

  const list = () => void navigate({ to: '/$org/settings/members', params: { org }, replace: true })
  const write = can(Scope.memberWrite)
  const words = searchWords(query)
  const shown = members?.filter((member) => hasWords(`${member.user?.name ?? ''} ${member.email}`, words))

  return (
    <>
      <SettingsBar org={org} title="Members">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a member" aria-label="Find a member" className="h-8 w-56 max-lg:hidden" />
        {write && (
          // The filled button is the page's main action; while a row is open that is the row's Save.
          <Button variant={openId ? 'outline' : 'default'} size="bar" onClick={() => void navigate({ to: '/$org/settings/members/new', params: { org }, replace: true })}>
            <Plus />
            Invite members
          </Button>
        )}
      </SettingsBar>
      <Sheet>
        {!shown ? (
          <RowSkeleton />
        ) : (
          <ul>
            {shown.map((member) => (
              <MemberRow
                key={member.id}
                org={org}
                member={member}
                me={me}
                teams={teams ?? []}
                projects={projects}
                memberTeams={teamsLoaded ? teamsOf(member) : undefined}
                editable={write && (member.role !== OrgRole.owner || me?.role === OrgRole.owner)}
                emailOn={emailOn}
                open={member.id === openId}
                onToggle={() => (member.id === openId ? list() : void navigate({ to: '/$org/settings/members/$memberId', params: { org, memberId: member.id }, replace: true }))}
                onClose={list}
              />
            ))}
            {shown.length === 0 && <li className="px-3 py-10 text-center text-muted-foreground md:px-4">No member matches “{query.trim()}”.</li>}
          </ul>
        )}
      </Sheet>
      {inviting && write && teams && <InviteDialog org={org} teams={teams} projects={projects} allowOwner={me?.role === OrgRole.owner} emailOn={emailOn} onClose={list} />}
    </>
  )
}

type RowProps = {
  org: string
  member: Member
  me?: Member
  teams: Team[]
  projects: Project[]
  // Undefined until every team's list has loaded.
  memberTeams?: string[]
  editable: boolean
  emailOn: boolean
  open: boolean
  onToggle: () => void
  onClose: () => void
}

function MemberRow(props: RowProps) {
  const { org, member, me, memberTeams, editable, open, onToggle } = props
  const mine = member.id === me?.id
  const [leaving, setLeaving] = useState(false)
  const summary = (
    <>
      <Initials name={memberName(member)} hollow={member.pending} />
      <span className="flex min-w-0 flex-1 flex-col py-2">
        <span className="flex items-center gap-2">
          <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{memberName(member)}</span>
          {mine && <Tag>You</Tag>}
        </span>
        <span className="text-sm text-muted-foreground [overflow-wrap:anywhere]" title={member.pending ? exact(member.dateCreated) : undefined}>
          {member.pending ? `Invited ${ago(member.dateCreated)} ago` : member.user?.name ? member.email : ''}
        </span>
      </span>
      <span className="mono w-40 text-muted-foreground max-lg:hidden">{memberTeams && teamList(memberTeams)}</span>
      <span className="w-16 shrink-0 text-sm lg:w-20">{ROLE_LABEL[member.role]}</span>
    </>
  )
  // Someone who cannot change members sees a plain list: nothing unfolds. Their own row carries the one thing they can do.
  if (!editable)
    return (
      <li className="flex min-h-14 items-center gap-3 border-b px-3 md:px-4">
        {summary}
        <span className="flex w-16 shrink-0 justify-end">
          {mine && member.role !== OrgRole.owner && (
            <Button onClick={() => setLeaving(true)}>
              Leave
            </Button>
          )}
        </span>
        {leaving && <RemoveMember org={org} member={member} mine onClose={() => setLeaving(false)} />}
      </li>
    )
  return (
    <li className={cn(open && 'bg-card')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={cn('flex min-h-14 w-full items-center gap-3 border-b px-3 text-left -outline-offset-2 hover:bg-accent md:px-4', open && 'border-b-0')}>
        {summary}
        <FoldRow.Chevron open={open} />
      </button>
      {open && (memberTeams ? <MemberEditor {...props} memberTeams={memberTeams} mine={mine} /> : <RowSkeleton rows={2} />)}
    </li>
  )
}

// What an open member row is asking to confirm.
const Question = { remove: 'remove', transfer: 'transfer' } as const
type Question = (typeof Question)[keyof typeof Question]

function MemberEditor({ org, member, me, teams, projects, memberTeams, emailOn, mine, onClose }: RowProps & { memberTeams: string[]; mine: boolean }) {
  const [role, setRole] = useState(member.role)
  const [chosen, setChosen] = useState(memberTeams)
  const [asking, setAsking] = useState<Question>()
  const added = chosen.filter((team) => !memberTeams.includes(team))
  const removed = memberTeams.filter((team) => !chosen.includes(team))
  const owner = me?.role === OrgRole.owner
  const save = useChange(
    'save the member',
    async () => {
      if (role !== member.role) await memberActions.setRole(org, member.id, role)
      for (const team of added) await teamActions.addMember(org, team, member.id)
      for (const team of removed) await teamActions.removeMember(org, team, member.id)
    },
    { stale: [stale.members(org), stale.teams(org)], onDone: onClose },
  )
  const resend = useChange('send the invite again', () => memberActions.resend(org, member), {
    stale: [stale.members(org)],
    failure: Failure.asNotice,
    onDone: () => notify(`Invite sent again to ${member.email}`),
  })
  const transfer = useChange('transfer ownership', () => memberActions.makeOwner(org, member.id), {
    // The user's own role, and with it what they may do here, changes too.
    stale: [stale.members(org), stale.organization(org)],
    onDone: () => setAsking(undefined),
  })
  return (
    <div className="flex flex-col gap-4 border-b px-3 pt-1 pb-4 md:px-4 lg:pl-13">
      <div className="grid max-w-2xl gap-4 lg:grid-cols-2">
        {/* Nobody changes their own role: an owner would lock the organization, anyone else would promote themselves. */}
        {!mine && <RoleField value={role} onChange={setRole} allowOwner={owner} />}
        <div className="flex flex-col gap-2">
          <span className="flex h-5 items-center text-sm font-medium">Teams</span>
          <TeamChecklist teams={teams} projects={projects} value={chosen} onChange={setChosen} />
        </div>
      </div>
      {save.error && <FormError>{save.error}</FormError>}
      <div className="flex flex-wrap gap-2">
        <Button variant="default" disabled={save.pending || (role === member.role && !added.length && !removed.length)} aria-busy={save.pending} onClick={() => save.run()}>
          Save
        </Button>
        {member.pending && <CopyButton text={() => memberActions.inviteLink(org, member)} label="Copy invite link" onError={(error) => failed(error, 'copy the invite link')} />}
        {member.pending && emailOn && (
          <Button disabled={resend.pending} aria-busy={resend.pending} onClick={() => resend.run()}>
            Send invite again
          </Button>
        )}
        {owner && !member.pending && !mine && (
          <Button onClick={() => setAsking(Question.transfer)}>
            Transfer ownership
          </Button>
        )}
        {mine && member.role === OrgRole.owner ? (
          <span className="flex items-center text-sm text-muted-foreground lg:ml-auto">To leave, make someone else the owner first.</span>
        ) : (
          <Button variant="destructive" className="lg:ml-auto" onClick={() => setAsking(Question.remove)}>
            {removal(org, member, mine).confirm}
          </Button>
        )}
      </div>
      {asking === Question.remove && <RemoveMember org={org} member={member} mine={mine} onClose={() => setAsking(undefined)} onDone={onClose} />}
      <Confirm
        open={asking === Question.transfer}
        onClose={() => {
          setAsking(undefined)
          transfer.clear()
        }}
        title={`Make ${memberName(member)} the owner?`}
        confirm="Transfer ownership"
        onConfirm={() => transfer.run()}
        pending={transfer.pending}
        error={transfer.error}
      >
        They will be able to rename or delete the organization and to hand ownership on.
      </Confirm>
    </div>
  )
}

// What taking someone out of the organization is called, asked and costs: leaving it yourself, cancelling an invite, or removing a member.
function removal(org: string, member: Member, mine: boolean) {
  if (mine) return { what: 'leave the organization', title: `Leave ${org}?`, confirm: 'Leave organization', loses: 'You lose access to its projects and issues until someone invites you again.' }
  if (member.pending) return { what: 'cancel the invite', title: `Cancel the invite for ${member.email}?`, confirm: 'Cancel invite', loses: 'The link they were sent stops working.' }
  return { what: 'remove the member', title: `Remove ${memberName(member)}?`, confirm: 'Remove', loses: "They lose access to this organization's projects and issues." }
}

function RemoveMember({ org, member, mine, onClose, onDone }: { org: string; member: Member; mine: boolean; onClose: () => void; onDone?: () => void }) {
  const navigate = useNavigate()
  const { what, title, confirm, loses } = removal(org, member, mine)
  const remove = useChange(what, () => memberActions.remove(org, member.id), {
    // Leaving takes the organization out of the user's list, so there is nothing here to go back to.
    stale: mine ? [stale.organizations()] : [stale.members(org), stale.teams(org)],
    leavesPage: mine,
    onDone: () => (mine ? void navigate({ to: '/' }) : onDone?.()),
  })
  return (
    <Confirm open onClose={onClose} title={title} confirm={confirm} destructive onConfirm={() => remove.run()} pending={remove.pending} error={remove.error}>
      {loses}
    </Confirm>
  )
}
