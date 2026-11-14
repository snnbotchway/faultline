import { createFileRoute, redirect } from '@tanstack/react-router'

// The path older setup wizards print.
export const Route = createFileRoute('/account/settings/wizard/$hash')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/profile/wizard/$hash', params, replace: true })
  },
})
