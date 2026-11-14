import { createFileRoute } from '@tanstack/react-router'
import { ProjectList } from '@/features/projects/project-list'

export const Route = createFileRoute('/_app/$org/projects')({ component: OrganizationProjects })

function OrganizationProjects() {
  return <ProjectList org={Route.useParams().org} />
}
