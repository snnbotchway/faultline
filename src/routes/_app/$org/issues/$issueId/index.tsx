import { createFileRoute } from '@tanstack/react-router'
import { IssuePage } from '@/features/issues/issue-page'

export const Route = createFileRoute('/_app/$org/issues/$issueId/')({ component: IssueRoute })

function IssueRoute() {
  const { org, issueId } = Route.useParams()
  return <IssuePage key={issueId} org={org} issueId={issueId} />
}
