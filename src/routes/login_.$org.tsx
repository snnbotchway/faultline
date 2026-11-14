import { createFileRoute } from '@tanstack/react-router'
import { LoginScreen } from '@/features/auth/login-screen'
import { authSearch, sendSignedInOn } from '@/features/auth/session-form'

// An organization's own sign-in page, with the providers that organization set up. The backend links to it.
export const Route = createFileRoute('/login_/$org')({
  validateSearch: authSearch,
  beforeLoad: ({ context, search }) => sendSignedInOn(context.queryClient, search.next),
  component: OrganizationLogin,
})

function OrganizationLogin() {
  const { org } = Route.useParams()
  const { next } = Route.useSearch()
  return <LoginScreen next={next} org={org} />
}
