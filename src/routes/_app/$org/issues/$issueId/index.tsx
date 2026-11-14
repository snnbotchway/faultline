import { createFileRoute } from '@tanstack/react-router'
import { NotBuilt } from '@/components/shell/not-built'

export const Route = createFileRoute('/_app/$org/issues/$issueId/')({
  component: () => <NotBuilt name="issue" />,
})
