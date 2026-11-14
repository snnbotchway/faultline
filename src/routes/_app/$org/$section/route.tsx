import { createFileRoute, notFound } from '@tanstack/react-router'
import { NotBuilt } from '@/components/shell/not-built'
import { OTHER_SECTION_PATHS, SECTIONS } from '@/components/shell/sections'

// Every stock section and anything beneath it, until each gets its own screen.
export const Route = createFileRoute('/_app/$org/$section')({
  beforeLoad: ({ params }) => {
    const known = SECTIONS.some((section) => section.path === params.section) || OTHER_SECTION_PATHS.includes(params.section)
    if (!known) throw notFound()
  },
  component: SectionPlaceholder,
})

function SectionPlaceholder() {
  const { section } = Route.useParams()
  return <NotBuilt name={SECTIONS.find((s) => s.path === section)?.label ?? section} />
}
