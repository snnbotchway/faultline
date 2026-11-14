import { Outlet, createFileRoute, useParams, useRouterState } from '@tanstack/react-router'
import { Members } from '@/features/settings/members'

// One screen for the three stock paths: the list, the list with the invite dialog (/new), and the list with a member unfolded.
export const Route = createFileRoute('/_app/$org/settings/members')({ component: MembersRoute })

function MembersRoute() {
  const { org } = Route.useParams()
  const { memberId } = useParams({ strict: false })
  const inviting = useRouterState({ select: (state) => state.location.pathname.replace(/\/$/, '').endsWith('/members/new') })
  return (
    <>
      <Members org={org} openId={memberId} inviting={inviting} />
      <Outlet />
    </>
  )
}
