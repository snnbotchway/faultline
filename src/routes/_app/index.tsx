import { createFileRoute, redirect } from '@tanstack/react-router'
import { organizationsQuery } from '@/api/organizations'
import { Screen } from '@/components/shell/app-shell'
import { LAST_ORG_KEY } from '@/lib/session'
import { useTitle } from '@/lib/title'

export const Route = createFileRoute('/_app/')({
  beforeLoad: async ({ context }) => {
    const organizations = await context.queryClient.ensureQueryData(organizationsQuery)
    const last = localStorage.getItem(LAST_ORG_KEY)
    const organization = organizations.find((o) => o.slug === last) ?? organizations[0]
    if (organization) throw redirect({ to: '/$org/issues', params: { org: organization.slug }, replace: true })
  },
  component: NoOrganization,
})

function NoOrganization() {
  useTitle()
  return (
    <div className="flex min-h-dvh">
      <Screen title="No organization yet">
        <p className="prose-text text-muted-foreground">Ask an owner to invite you to theirs.</p>
      </Screen>
    </div>
  )
}
