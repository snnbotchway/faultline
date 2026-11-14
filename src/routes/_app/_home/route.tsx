import { Outlet, createFileRoute } from '@tanstack/react-router'
import { organizationsQuery } from '@/api/organizations'
import { AccountShell } from '@/features/account/shell'

// Pages that belong to no one organization: the projects of all of them, a new one, the server's details.
// They sit in the shell of the organization the user was last in, or in the bare bar when they are in none.
export const Route = createFileRoute('/_app/_home')({
  loader: ({ context }) => context.queryClient.ensureQueryData(organizationsQuery),
  component: () => (
    <AccountShell>
      <Outlet />
    </AccountShell>
  ),
})
