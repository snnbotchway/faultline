import { Outlet, createFileRoute, useParams } from '@tanstack/react-router'
import { Teams } from '@/features/settings/teams'

// One screen for the stock team paths: the list, and the list with a team unfolded (/:team/members, /projects, /settings).
export const Route = createFileRoute('/_app/$org/settings/teams')({ component: TeamsRoute })

function TeamsRoute() {
  const { org } = Route.useParams()
  const { team } = useParams({ strict: false })
  return (
    <>
      <Teams org={org} openSlug={team} />
      <Outlet />
    </>
  )
}
