import { createFileRoute } from '@tanstack/react-router'
import { validatePerformanceSearch } from '@/features/performance/search'
import { Performance } from '@/features/performance/transactions'

export const Route = createFileRoute('/_app/$org/performance/transaction-groups/')({
  validateSearch: validatePerformanceSearch,
  component: PerformanceRoute,
})

function PerformanceRoute() {
  return <Performance org={Route.useParams().org} search={Route.useSearch()} />
}
