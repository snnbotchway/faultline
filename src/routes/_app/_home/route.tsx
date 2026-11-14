import { Outlet, createFileRoute } from '@tanstack/react-router'
import { organizationsQuery } from '@/api/organizations'
import { AppShell } from '@/components/shell/app-shell'
import { useLastOrganization } from '@/features/settings/access'

// Pages that belong to no one organization: the projects of all of them, a new one, the server's details.
// The shell around them is the organization the user was last in.
export const Route = createFileRoute('/_app/_home')({
  loader: ({ context }) => context.queryClient.ensureQueryData(organizationsQuery),
  component: HomeLayout,
})

function HomeLayout() {
  const org = useLastOrganization()
  if (!org)
    return (
      <div className="flex min-h-dvh flex-col">
        <Outlet />
      </div>
    )
  return (
    <AppShell org={org}>
      <Outlet />
    </AppShell>
  )
}
