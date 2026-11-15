import { createFileRoute, redirect } from '@tanstack/react-router'
import { organizationsQuery, projectsQuery } from '@/api/organizations'
import { projectLink } from '@/features/projects/link'
import { ProjectList } from '@/features/projects/project-list'

// With a single project there is nothing to pick, so home opens it. /:org/projects stays a list, for creating another.
export const Route = createFileRoute('/_app/_home/')({
  loader: async ({ context: { queryClient } }) => {
    // Both fetched again once stale, so an organization just deleted or left, a second project, or a project's first
    // event is seen. A list that fails to load is left for the screen to report.
    const organizations = await queryClient.fetchQuery(organizationsQuery)
    const lists = await Promise.all(organizations.map(({ slug }) => queryClient.fetchQuery(projectsQuery(slug)).catch(() => undefined)))
    if (lists.some((list) => list === undefined)) return
    const all = lists.flatMap((list, index) => (list ?? []).map((project) => ({ org: organizations[index]!.slug, project })))
    if (all.length === 1) throw redirect({ ...projectLink(all[0]!.org, all[0]!.project), replace: true })
  },
  // The list's own loading rows, while the loader decides whether to open the only project.
  pendingComponent: ProjectList,
  component: ProjectList,
})
