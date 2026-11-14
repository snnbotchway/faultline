import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { SessionStatus, sessionQuery } from '@/api/auth'

// Everything under here needs a signed-in user.
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    if (session.status !== SessionStatus.authenticated) throw redirect({ to: '/login', search: { next: location.href } })
  },
  component: Outlet,
})
