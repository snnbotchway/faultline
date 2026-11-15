import { createFileRoute, redirect } from '@tanstack/react-router'
import { organizationsQuery, projectsQuery } from '@/api/organizations'
import { projectLink } from '@/features/projects/link'
import { ProjectList } from '@/features/projects/project-list'

// With a single project there is nothing to pick, so arriving at home opens it. Clicking the Faultline mark keeps the
// list, as does /:org/projects, for creating another.
export const Route = createFileRoute('/_app/_home/')({
  loader: async ({ context: { queryClient }, location }) => {
    if (location.state.projectList) return
    // Both fetched again once stale, so an organization just deleted or left, a second project, or a project's first
    // event is seen. A list that fails to load is left for the screen to report.
    const organizations = await queryClient.fetchQuery(organizationsQuery).catch(() => undefined)
    if (!organizations) return
    const lists = await Promise.all(organizations.map(({ slug }) => queryClient.fetchQuery(projectsQuery(slug)).catch(() => undefined)))
    if (lists.some((list) => list === undefined)) return
    const all = lists.flatMap((list, index) => (list ?? []).map((project) => ({ org: organizations[index]!.slug, project })))
    if (all.length === 1) throw redirect({ ...projectLink(all[0]!.org, all[0]!.project), replace: true })
  },
  // The list's own loading rows, while the loader decides whether to open the only project. Each wrapped in its own
  // function: the router's code splitting drops the import when both name the same component directly.
  pendingComponent: () => <ProjectList />,
  component: () => <ProjectList />,
})
