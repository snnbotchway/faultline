import { createFileRoute } from '@tanstack/react-router'
import { IssuePage } from '@/features/issues/issue-page'

export const Route = createFileRoute('/_app/$org/issues/$issueId/events/$eventId')({ component: EventRoute })

function EventRoute() {
  const { org, issueId, eventId } = Route.useParams()
  return <IssuePage key={issueId} org={org} issueId={issueId} eventId={eventId} />
}
