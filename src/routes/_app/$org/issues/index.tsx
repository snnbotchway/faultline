import { createFileRoute } from '@tanstack/react-router'
import { Inbox } from '@/features/issues/inbox'
import { validateInboxSearch } from '@/features/issues/search'

export const Route = createFileRoute('/_app/$org/issues/')({
  validateSearch: validateInboxSearch,
  component: InboxRoute,
})

function InboxRoute() {
  return <Inbox org={Route.useParams().org} search={Route.useSearch()} />
}
