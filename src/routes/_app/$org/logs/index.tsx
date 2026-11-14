import { createFileRoute } from '@tanstack/react-router'
import { LogsPage } from '@/features/logs/logs'
import { validateLogSearch } from '@/features/logs/search'

export const Route = createFileRoute('/_app/$org/logs/')({
  validateSearch: validateLogSearch,
  component: LogsRoute,
})

function LogsRoute() {
  return <LogsPage org={Route.useParams().org} search={Route.useSearch()} />
}
