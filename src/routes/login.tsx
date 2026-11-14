import { createFileRoute } from '@tanstack/react-router'
import { LoginScreen } from '@/features/auth/login-screen'
import { LoginNotice, authSearch, sendSignedInOn, type AuthSearch } from '@/features/auth/session-form'

// `socialLoginError` is set by the backend when a provider sign-in fails; `passwordChanged` by the reset screen.
type LoginSearch = AuthSearch & { socialLoginError?: boolean; passwordChanged?: boolean }

const flag = (value: unknown) => value === true || value === 'true' || undefined

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    ...authSearch(search),
    socialLoginError: flag(search.socialLoginError),
    passwordChanged: flag(search.passwordChanged),
  }),
  beforeLoad: ({ context, search }) => sendSignedInOn(context.queryClient, search.next),
  component: Login,
})

function Login() {
  const search = Route.useSearch()
  const notice = search.socialLoginError ? LoginNotice.socialFailed : search.passwordChanged ? LoginNotice.passwordChanged : undefined
  return <LoginScreen next={search.next} notice={notice} />
}
