import { useQuery } from '@tanstack/react-query'
import { currentUserQuery, hasScope, instanceSettingsQuery, membersQuery, organizationQuery, organizationsQuery, type Scope } from '@/api/organizations'
import { LAST_ORG_KEY } from '@/lib/session'

// The organization the user was last in, for pages that belong to none. Undefined when they are in no organization.
export function useLastOrganization() {
  const organizations = useQuery(organizationsQuery).data ?? []
  const last = localStorage.getItem(LAST_ORG_KEY)
  return (organizations.find((organization) => organization.slug === last) ?? organizations[0])?.slug
}

// Whether the backend is known to let the user create an organization: it is open to everyone, or they are a superuser.
// The backend also lets anyone create the server's first one, which the UI cannot see, so a user in none may still try.
export function useCanCreateOrganization() {
  const open = useQuery(instanceSettingsQuery).data?.enableOrganizationCreation === true
  const superuser = useQuery(currentUserQuery).data?.isSuperuser === true
  return open || superuser
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
