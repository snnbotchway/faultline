import { OrgRole } from '@/api/members'

// Lowest to highest. Each role can do everything the one before it can.
export const ROLES: OrgRole[] = [OrgRole.member, OrgRole.admin, OrgRole.manager, OrgRole.owner]

export const ROLE_LABEL: Record<OrgRole, string> = { member: 'Member', admin: 'Admin', manager: 'Manager', owner: 'Owner' }

// What each role adds to the one before it.
export const ROLE_ADDS: Record<OrgRole, string> = {
  member: 'Works on issues in the projects of their teams: resolve, ignore, assign, comment.',
  admin: 'Also changes the projects and teams they are on: settings, client keys, alerts, team members.',
  manager: 'Also invites and removes members, and changes every team and project.',
  owner: 'Also renames or deletes the organization, and can hand ownership to someone else.',
}

export const atLeast = (role: OrgRole, minimum: OrgRole) => ROLES.indexOf(role) >= ROLES.indexOf(minimum)
