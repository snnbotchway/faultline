import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { explain } from '@/api/errors'
import { currentUserQuery, hasScope, membersQuery, organizationKeys, organizationQuery, organizationsQuery, type Scope } from '@/api/organizations'
import { failed } from '@/lib/notice'
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

/**
 * One change to the organization's settings. `what` completes "Couldn't …". The result shows up in the
 * lists it changed, which are fetched again; a failure is returned for a form to show under its fields,
 * or raised as a notice when the control has no form (`notice`). `everyOrganization` is for a change to the list of
 * organizations itself. `gone` is for a change that removes what the page is showing.
 */
export function useChange<Input = void, Result = unknown>(
  org: string,
  what: string,
  change: (input: Input) => Promise<Result>,
  options: { onDone?: (result: Result, input: Input) => void; notice?: boolean; everyOrganization?: boolean; gone?: boolean } = {},
) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  async function run(input: Input) {
    setPending(true)
    setError(undefined)
    try {
      const result = await change(input)
      const refresh = () => queryClient.invalidateQueries({ queryKey: options.everyOrganization ? organizationKeys.all : organizationKeys.detail(org) })
      if (options.gone) {
        // Leave first: fetching the removed thing again would only fail, and waiting for that would hold the page.
        options.onDone?.(result, input)
        void refresh()
      } else {
        await refresh()
        options.onDone?.(result, input)
      }
    } catch (caught) {
      if (options.notice) failed(caught, what)
      else setError(explain(caught, what))
    } finally {
      setPending(false)
    }
  }
  return { run: (input: Input) => void run(input), pending, error, clear: () => setError(undefined) }
}
