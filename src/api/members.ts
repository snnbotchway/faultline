import { api, orgPath, unwrap } from './client'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
export type Member = Schemas['OrganizationUserSchema']

export const OrgRole = { member: 'member', admin: 'admin', manager: 'manager', owner: 'owner' } as const
export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole]

const memberPath = (org: string, id: string) => ({ ...orgPath(org), member_id: Number(id) })

export type Invite = { email: string; role: OrgRole; teams: string[] }

async function postInvite(org: string, invite: Invite, options: { sendInvite: boolean; reinvite: boolean }) {
  return unwrap(
    await api.POST('/api/0/organizations/{organization_id_or_slug}/members/', {
      params: { path: orgPath(org) },
      // The backend has no separate role inside a team; it wants one named all the same.
      body: { email: invite.email, orgRole: invite.role, teamRoles: invite.teams.map((teamSlug) => ({ teamSlug, role: invite.role })), ...options },
    }),
  )
}

export const memberActions = {
  // `sendEmail` is false on a server that cannot send mail; the answer then carries the link to pass on by hand.
  invite: (org: string, invite: Invite, sendEmail: boolean) => postInvite(org, invite, { sendInvite: sendEmail, reinvite: false }),
  resend: (org: string, member: Member) => postInvite(org, { email: member.email, role: member.role, teams: [] }, { sendInvite: true, reinvite: true }),
  // The member list never carries an invite's link; inviting again without an email is how the backend hands it back.
  inviteLink: async (org: string, member: Member) => {
    const { inviteLink } = await postInvite(org, { email: member.email, role: member.role, teams: [] }, { sendInvite: false, reinvite: true })
    if (!inviteLink) throw new Error("Couldn't get the invite link. Cancel the invite and send a new one.")
    return inviteLink
  },
  setRole: async (org: string, id: string, role: OrgRole) =>
    unwrap(
      await api.PUT('/api/0/organizations/{organization_id_or_slug}/members/{member_id}/', {
        params: { path: memberPath(org, id) },
        body: { orgRole: role },
      }),
    ),
  remove: async (org: string, id: string) =>
    unwrap(await api.DELETE('/api/0/organizations/{organization_id_or_slug}/members/{member_id}/', { params: { path: memberPath(org, id) } })),
  makeOwner: async (org: string, id: string) =>
    unwrap(
      await api.POST('/api/0/organizations/{organization_id_or_slug}/members/{member_id}/set_owner/', { params: { path: memberPath(org, id) } }),
    ),
}
