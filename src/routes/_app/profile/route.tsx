import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { alertsQuery, emailsQuery, notificationsQuery, tokensQuery, twoStepQuery } from '@/api/account'
import { currentUserQuery, instanceSettingsQuery, organizationsQuery } from '@/api/organizations'
import { Landing } from '@/features/account/landing'
import { ProfilePage, ProfileSkeleton } from '@/features/account/profile-page'
import { AccountShell } from '@/features/account/shell'

// The stock paths under /profile all show the same sheet; the path picks where on it to land.
const LANDINGS: Record<string, Landing> = {
  '/profile/multi-factor-auth': Landing.twoStep,
  '/profile/notifications': Landing.notifications,
  '/profile/auth-tokens': Landing.tokens,
  '/profile/auth-tokens/new': Landing.newToken,
}

export const Route = createFileRoute('/_app/profile')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(organizationsQuery),
      queryClient.ensureQueryData(currentUserQuery),
      queryClient.ensureQueryData(emailsQuery),
      queryClient.ensureQueryData(twoStepQuery),
      queryClient.ensureQueryData(tokensQuery),
      queryClient.ensureQueryData(notificationsQuery),
      queryClient.ensureQueryData(alertsQuery),
      queryClient.ensureQueryData(instanceSettingsQuery),
    ]),
  pendingComponent: () => (
    <AccountShell>
      <ProfileSkeleton />
    </AccountShell>
  ),
  component: Profile,
})

function Profile() {
  const pathname = useRouterState({ select: (state) => state.location.pathname.replace(/\/$/, '') })
  return (
    <AccountShell>
      <ProfilePage landing={LANDINGS[pathname] ?? Landing.top} />
      <Outlet />
    </AccountShell>
  )
}
