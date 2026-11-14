import { createFileRoute } from '@tanstack/react-router'
import { UsagePrototype, toUsageVariant, type UsageVariant } from '@/features/settings/usage-prototype'

// PROTOTYPE: `?variant=` picks one of the usage page's candidate layouts.
export const Route = createFileRoute('/_app/$org/settings/subscription')({
  validateSearch: (search: Record<string, unknown>): { variant?: UsageVariant } => ({ variant: search.variant === undefined ? undefined : toUsageVariant(search.variant) }),
  component: Usage,
})

function Usage() {
  return <UsagePrototype org={Route.useParams().org} variant={toUsageVariant(Route.useSearch().variant)} />
}
