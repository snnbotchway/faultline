import { createFileRoute } from '@tanstack/react-router'
import { ProjectPage } from '@/features/settings/project-page'
import { validateProjectSearch } from '@/features/settings/project-tabs'

// The stock path and its ?tab= values, so links in old alert emails still land on the right tab.
export const Route = createFileRoute('/_app/$org/settings/projects/$project')({
  validateSearch: validateProjectSearch,
  component: Project,
})

function Project() {
  const { org, project } = Route.useParams()
  return <ProjectPage key={project} org={org} slug={project} tab={Route.useSearch().tab} />
}
