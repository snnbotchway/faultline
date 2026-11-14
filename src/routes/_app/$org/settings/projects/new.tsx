import { createFileRoute } from '@tanstack/react-router'
import { NewProject } from '@/features/settings/new-project'

export const Route = createFileRoute('/_app/$org/settings/projects/new')({ component: New })

function New() {
  return <NewProject org={Route.useParams().org} />
}
