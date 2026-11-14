import { createFileRoute } from '@tanstack/react-router'
import { ReleasePage } from '@/features/releases/release-page'

// A splat, because a version can contain `/` (and `@`): `/demo-co/releases/web@1.2/build-7`.
export const Route = createFileRoute('/_app/$org/releases/$')({ component: ReleaseRoute })

function ReleaseRoute() {
  const { org, _splat: version = '' } = Route.useParams()
  return <ReleasePage key={version} org={org} version={version} />
}
