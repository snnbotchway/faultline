import { createFileRoute } from '@tanstack/react-router'
import { ReleaseList } from '@/features/releases/release-list'

export const Route = createFileRoute('/_app/$org/releases/')({ component: ReleasesRoute })

function ReleasesRoute() {
  return <ReleaseList org={Route.useParams().org} />
}
