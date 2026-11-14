import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { SessionStatus, type Session } from '@/api/auth'
import { instanceSettingsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { AuthFrame, AuthLinks } from '@/features/auth/frame'
import { SignUpForm } from '@/features/auth/forms'
import { authSearch, sendSignedInOn } from '@/features/auth/session-form'
import { SocialButtons } from '@/features/auth/social'

export const Route = createFileRoute('/register')({
  validateSearch: authSearch,
  beforeLoad: ({ context, search }) => sendSignedInOn(context.queryClient, search.next),
  // The server decides whether anyone may sign up, so the form waits for its answer.
  loader: ({ context }) => context.queryClient.ensureQueryData(instanceSettingsQuery),
  component: Register,
})

function Register() {
  const { next } = Route.useSearch()
  const settings = useQuery(instanceSettingsQuery).data
  const router = useRouter()
  const navigate = useNavigate()

  if (settings && !settings.enableUserRegistration)
    return (
      <AuthFrame title="Sign-up is closed">
        <p className="prose-text mb-4 text-muted-foreground">Ask an administrator to invite you.</p>
        <Button asChild className="max-lg:h-11">
          <Link to="/login" search={{ next }}>
            Back to sign in
          </Link>
        </Button>
      </AuthFrame>
    )

  // Signed in: the guard sends them on. Anything else is a step the sign-in page knows how to finish.
  const onSession = (session: Session) => void (session.status === SessionStatus.authenticated ? router.invalidate() : navigate({ to: '/login', search: { next } }))

  return (
    <AuthFrame title="Create account">
      <SignUpForm onSession={onSession} />
      {settings?.enableSocialAppsUserRegistration && <SocialButtons apps={settings.socialApps} next={next} />}
      <AuthLinks>
        <Button variant="link" asChild>
          <Link to="/login" search={{ next }}>
            Sign in instead
          </Link>
        </Button>
      </AuthLinks>
    </AuthFrame>
  )
}
