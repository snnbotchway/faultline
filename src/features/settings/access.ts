import { useQuery } from '@tanstack/react-query'
import { currentUserQuery, hasScope, instanceSettingsQuery, membersQuery, organizationQuery, organizationsQuery, type Scope } from '@/api/organizations'
import { LAST_ORG_KEY } from '@/lib/session'

// The organization the user was last in, for pages that belong to none. Undefined when they are in no organization.
export function useLastOrganization() {
  const organizations = useQuery(organizationsQuery).data ?? []
  const last = localStorage.getItem(LAST_ORG_KEY)
  return (organizations.find((organization) => organization.slug === last) ?? organizations[0])?.slug
}

// Whether the signed-in user administers the whole server. False until their account has loaded.
export function useIsSuperuser() {
  return useQuery(currentUserQuery).data?.isSuperuser === true
}

// Whether the backend is known to let the user create an organization: it is open to everyone, or they are a superuser.
// Undefined until both are loaded. The backend also lets anyone create the server's first one, which the UI cannot
// see, so false does not mean a user in none will be refused.
export function useOrganizationCreationOpen() {
  const settings = useQuery(instanceSettingsQuery).data
  const user = useQuery(currentUserQuery).data
  if (!settings || !user) return undefined
  return settings.enableOrganizationCreation || user.isSuperuser
}

// What the signed-in user may do in this organization. Everything is refused until the organization has loaded.
export function useAccess(org: string) {
  const access = useQuery(organizationQuery(org)).data?.access
  return (scope: Scope) => hasScope(access, scope)
}

// The signed-in user's own membership of the organization.
export function useOwnMember(org: string) {
  const userId = useQuery(currentUserQuery).data?.id
  const members = useQuery(membersQuery(org)).data
  return userId === undefined ? undefined : members?.find((member) => member.user?.id === userId)
}
