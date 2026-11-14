import { useQuery } from '@tanstack/react-query'
import { currentUserQuery, hasScope, membersQuery, organizationQuery, organizationsQuery, type Scope } from '@/api/organizations'
import { LAST_ORG_KEY } from '@/lib/session'

// The organization the user was last in, for pages that belong to none. Undefined when they are in no organization.
export function useLastOrganization() {
  const organizations = useQuery(organizationsQuery).data ?? []
  const last = localStorage.getItem(LAST_ORG_KEY)
  return (organizations.find((organization) => organization.slug === last) ?? organizations[0])?.slug
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
