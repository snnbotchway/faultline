import { createFileRoute, redirect } from '@tanstack/react-router'

// An old stock path that tools and docs still link to.
export const Route = createFileRoute('/orgredirect/organizations/$org/settings/auth-tokens')({
  beforeLoad: () => {
    throw redirect({ to: '/profile/auth-tokens', replace: true })
  },
})
