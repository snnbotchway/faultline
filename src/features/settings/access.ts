import { useQuery, useQueryClient, type QueryFilters } from '@tanstack/react-query'
import { useState } from 'react'
import { explain } from '@/api/errors'
import { currentUserQuery, hasScope, membersQuery, organizationQuery, organizationsQuery, type Scope } from '@/api/organizations'
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

// Where a failed change says so: under the form it came from, or as a notice when the control has no form.
export const Failure = { inForm: 'inForm', asNotice: 'asNotice' } as const
export type Failure = (typeof Failure)[keyof typeof Failure]

type ChangeOptions<Input, Result> = {
  // What the change makes out of date; fetched again before `onDone` runs.
  stale: readonly QueryFilters[]
  failure?: Failure
  onDone?: (result: Result, input: Input) => void
  // For a change that removes the page it was made on: `onDone` runs first, as fetching the removed thing again would only fail.
  leavesPage?: boolean
}

/**
 * One change to settings. `what` completes "Couldn't …". A failure in a form is returned as `error` for the form to
 * show under its fields.
 */
export function useChange<Input = void, Result = unknown>(what: string, change: (input: Input) => Promise<Result>, options: ChangeOptions<Input, Result>) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  async function run(input: Input) {
    setPending(true)
    setError(undefined)
    try {
      const result = await change(input)
      const refresh = () => Promise.all(options.stale.map((filters) => queryClient.invalidateQueries(filters)))
      if (options.leavesPage) {
        options.onDone?.(result, input)
        void refresh()
      } else {
        await refresh()
        options.onDone?.(result, input)
      }
    } catch (caught) {
      if (options.failure === Failure.asNotice) failed(caught, what)
      else setError(explain(caught, what))
    } finally {
      setPending(false)
    }
  }
  return { run: (input: Input) => void run(input), pending, error, clear: () => setError(undefined) }
}
