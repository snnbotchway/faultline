import { createFileRoute, redirect } from '@tanstack/react-router'
import { sessionQuery } from '@/api/auth'
import { authSearch, sendSignedInOn } from '@/features/auth/session-form'

// Where a provider sends the person back to. Signed in: on to `next`. Otherwise the sign-in page shows what is left to do.
export const Route = createFileRoute('/login_/finalize')({
  validateSearch: authSearch,
  beforeLoad: async ({ context, search }) => {
    await context.queryClient.fetchQuery(sessionQuery)
    await sendSignedInOn(context.queryClient, search.next)
    throw redirect({ to: '/login', search: { next: search.next }, replace: true })
  },
})
