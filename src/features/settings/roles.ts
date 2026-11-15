import { OrgRole } from '@/api/members'

// Lowest to highest. Each role can do everything the one before it can.
export const ROLES: OrgRole[] = [OrgRole.member, OrgRole.admin, OrgRole.manager, OrgRole.owner]
// Their names, and what each adds to the one before it, are in the catalog under `settings.roles`.
