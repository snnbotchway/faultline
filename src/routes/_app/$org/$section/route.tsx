import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { projectsQuery } from '@/api/organizations'
import { NotBuilt } from '@/components/shell/not-built'
import { OTHER_SECTION_PATHS, SECTIONS } from '@/components/shell/sections'

// Every stock section and anything beneath it, until each gets its own screen.
export const Route = createFileRoute('/_app/$org/$section')({
  beforeLoad: async ({ context, params }) => {
    const known = SECTIONS.some((section) => section.path === params.section) || OTHER_SECTION_PATHS.includes(params.section)
    if (known) return
    // The stock UI sends /:org/:project to the project's settings; old links still do.
    const projects = await context.queryClient.ensureQueryData(projectsQuery(params.org))
    if (!projects.some((project) => project.slug === params.section)) throw notFound()
    throw redirect({ to: '/$org/settings/projects/$project', params: { org: params.org, project: params.section }, replace: true })
  },
  component: SectionPlaceholder,
})

function SectionPlaceholder() {
  const { section } = Route.useParams()
  return <NotBuilt name={SECTIONS.find((s) => s.path === section)?.label ?? section} />
}
