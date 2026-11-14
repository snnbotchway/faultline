import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'
import { organizationsQuery } from '@/api/organizations'
import { AppShell } from '@/components/shell/app-shell'
import { LAST_ORG_KEY } from '@/lib/session'

export const Route = createFileRoute('/_app/$org')({
  beforeLoad: async ({ context, params }) => {
    const organizations = await context.queryClient.ensureQueryData(organizationsQuery)
    if (!organizations.some((organization) => organization.slug === params.org)) throw notFound()
  },
  component: OrganizationLayout,
})

function OrganizationLayout() {
  const { org } = Route.useParams()
  useEffect(() => localStorage.setItem(LAST_ORG_KEY, org), [org])
  return (
    <AppShell org={org}>
      <Outlet />
    </AppShell>
  )
}
