import { useState } from 'react'
import { explain } from '@/api/errors'
import { OrgRole, memberActions } from '@/api/members'
import type { Project } from '@/api/projects'
import type { Team } from '@/api/teams'
import { stale } from '@/api/stale'
import { Input } from '@/components/ui/input'
import { useChange } from './change'
import { RoleField, TeamChecklist } from './fields'
import { parseEmails } from './invite'
import { CopyField, Field, FormDialog, FormError } from './parts'

type Outcome = { email: string; link?: string | null; error?: string }

/**
 * Invites one or more people with one role and set of teams. On a server that sends email the result is the new
 * rows in the list. On one that does not, the links are the only delivery, so the dialog stays to hand them over.
 */
export function InviteDialog({
  org,
  teams,
  projects,
  allowOwner,
  emailOn,
  onClose,
}: {
  org: string
  teams: Team[]
  projects: Project[]
  allowOwner: boolean
  emailOn: boolean
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [role, setRole] = useState<OrgRole>(OrgRole.member)
  const [chosen, setChosen] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [links, setLinks] = useState<Outcome[]>()
  const [refused, setRefused] = useState<Outcome[]>([])
  const { emails, invalid } = parseEmails(text)

  const invite = useChange(
    'send the invites',
    async (): Promise<Outcome[]> => {
      const outcomes: Outcome[] = []
      // One at a time, so each address gets its own answer and one refusal does not stop the rest.
      for (const email of emails) {
        try {
          const member = await memberActions.invite(org, { email, role, teams: chosen }, emailOn)
          outcomes.push({ email, link: member.inviteLink })
        } catch (error) {
          outcomes.push({ email, error: explain(error, `invite ${email}`) })
        }
      }
      return outcomes
    },
    {
      stale: [stale.members(org), stale.teams(org)],
      onDone: (outcomes) => {
        const failures = outcomes.filter((outcome) => outcome.error)
        const invited = outcomes.filter((outcome) => !outcome.error)
        setRefused(failures)
        // Only the addresses that were refused stay in the field, to be fixed and sent again.
        setText(failures.map((outcome) => outcome.email).join(', '))
        setChecked(false)
        if (!emailOn && invited.length) setLinks((earlier) => [...(earlier ?? []), ...invited])
        else if (!failures.length) onClose()
      },
    },
  )
  const submit = () => {
    setChecked(true)
    if (emails.length && !invalid.length) invite.run()
  }

  if (links && !refused.length)
    return (
      <FormDialog open onClose={onClose} title={links.length === 1 ? 'Invite link' : `${links.length} invite links`}>
        <p className="prose-text">This server doesn't send email. Pass each link on yourself.</p>
        {links.map((outcome) => (
          <div key={outcome.email} className="flex flex-col gap-2">
            <span className="text-sm font-medium [overflow-wrap:anywhere]">{outcome.email}</span>
            <CopyField value={outcome.link ?? ''} label={`Invite link for ${outcome.email}`} />
          </div>
        ))}
      </FormDialog>
    )

  const count = emails.length
  const label = emailOn ? (count > 1 ? `Send ${count} invites` : 'Send invite') : count > 1 ? `Create ${count} invite links` : 'Create invite link'
  const emailError = !checked ? undefined : invalid.length ? `${invalid.join(', ')} ${invalid.length === 1 ? "isn't an email address" : "aren't email addresses"}.` : !count ? 'Enter at least one email address.' : undefined
  return (
    <FormDialog open onClose={onClose} title="Invite members" submit={label} onSubmit={submit} pending={invite.pending} error={invite.error}>
      <Field label="Email addresses" error={emailError}>
        {(field) => (
          <Input {...field} autoFocus value={text} onChange={(event) => setText(event.target.value)} inputMode="email" autoComplete="off" autoCapitalize="off" spellCheck={false} />
        )}
      </Field>
      {refused.map((outcome) => (
        <FormError key={outcome.email}>
          {outcome.email}: {outcome.error}
        </FormError>
      ))}
      <RoleField value={role} onChange={setRole} allowOwner={allowOwner} />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Teams</span>
        <TeamChecklist teams={teams} projects={projects} value={chosen} onChange={setChosen} />
      </div>
    </FormDialog>
  )
}
