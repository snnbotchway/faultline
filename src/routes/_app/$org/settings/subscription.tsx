import { createFileRoute } from '@tanstack/react-router'
import { UsagePage } from '@/features/settings/usage-page'

// The stock path of the subscription page, which without billing shows usage.
export const Route = createFileRoute('/_app/$org/settings/subscription')({ component: Usage })

function Usage() {
  const { org } = Route.useParams()
  return <UsagePage key={org} org={org} />
}
