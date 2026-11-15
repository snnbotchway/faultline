import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { acceptInvite, inviteQuery } from '@/api/account'
import { SessionStatus, sessionQuery, type Session } from '@/api/auth'
import { ApiError } from '@/api/client'
import { explain } from '@/api/errors'
import { instanceSettingsQuery, organizationKeys, organizationsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { FormAlert, FULL_BUTTON } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthFrame, AuthLinks } from '@/features/auth/frame'
import { SignInForm, SignUpForm } from '@/features/auth/forms'
import { SocialButtons } from '@/features/auth/social'
import { useT } from '@/i18n'
import { signOut } from '@/lib/session'

// The link in an invitation email. Anyone holding it may accept, signed in or not.
export const Route = createFileRoute('/accept/$memberId/$token')({ component: AcceptInvite })

// The backend's answers for a link that was used, has expired, or never existed.
const GONE = [403, 404]

const Joining = { signUp: 'signUp', signIn: 'signIn' } as const
type Joining = (typeof Joining)[keyof typeof Joining]

function AcceptInvite() {
  const { memberId, token } = Route.useParams()
  const here = `/accept/${memberId}/${token}`
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const invite = useQuery(inviteQuery(memberId, token))
  const session = useQuery(sessionQuery).data
  const settings = useQuery(instanceSettingsQuery).data
  const signedIn = session?.status === SessionStatus.authenticated
  const organizations = useQuery({ ...organizationsQuery, enabled: signedIn }).data
  const [joining, setJoining] = useState<Joining>(Joining.signUp)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const { auth: t, common } = useT()
  const text = t.invite

  if (invite.isPending)
    return (
      <AuthFrame title={text.title}>
        <Skeleton className="h-10" />
      </AuthFrame>
    )

  const gone = invite.error instanceof ApiError && GONE.includes(invite.error.status)
  if (invite.isError && !gone)
    return (
      <AuthFrame title={text.didntLoad}>
        <Button className="max-lg:h-11" onClick={() => void invite.refetch()}>
          {common.tryAgain}
        </Button>
      </AuthFrame>
    )
  if (gone || !invite.data?.orgUser.pending)
    return (
      <AuthFrame title={text.expired}>
        <p className="prose-text mb-4 text-muted-foreground">{text.askForNew}</p>
        <Button asChild className="max-lg:h-11">
          {signedIn ? <Link to="/">{common.goToIssues}</Link> : <Link to="/login">{t.signIn}</Link>}
        </Button>
      </AuthFrame>
    )

  const { organization, roleName, email } = invite.data.orgUser
  const open = () => navigate({ to: '/$org/issues', params: { org: organization.slug } })

  async function join() {
    setBusy(true)
    setMessage('')
    try {
      await acceptInvite(memberId, token)
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      await open()
    } catch (error) {
      setMessage(explain(error, text.acceptAction))
    } finally {
      setBusy(false)
    }
  }

  // With a second step still to do, the sign-in page finishes it and comes back here.
  const onSession = (result: Session) => void (result.status === SessionStatus.authenticated ? join() : navigate({ to: '/login', search: { next: here } }))

  const role = (
    <p className="-mt-3 mb-5 text-muted-foreground">
      {text.invitedAs} <span className="font-medium text-foreground">{roleName}</span>
    </p>
  )

  if (signedIn && organizations?.some((item) => item.slug === organization.slug))
    return (
      <AuthFrame title={text.alreadyIn(organization.name)}>
        <Button variant="default" className={FULL_BUTTON} onClick={() => void open()}>
          {text.open(organization.name)}
        </Button>
      </AuthFrame>
    )

  if (signedIn)
    return (
      <AuthFrame title={text.join(organization.name)}>
        {role}
        <FormAlert className="mb-4">{message}</FormAlert>
        <p className="prose-text mb-4 text-muted-foreground">
          {text.signedInAs} <span className="mono [overflow-wrap:anywhere] text-foreground">{session.user.email ?? session.user.display}</span>
        </p>
        <Button variant="default" className={FULL_BUTTON} disabled={busy} aria-busy={busy} onClick={() => void join()}>
          {text.join(organization.name)}
        </Button>
        <AuthLinks>
          <Button variant="link" onClick={() => void signOut(queryClient)}>
            {t.useAnotherAccount}
          </Button>
        </AuthLinks>
      </AuthFrame>
    )

  // A closed server only invites people who already have an account.
  const canSignUp = settings?.enableUserRegistration !== false
  const signingUp = canSignUp && joining === Joining.signUp
  return (
    <AuthFrame title={text.join(organization.name)}>
      {role}
      <FormAlert className="mb-4">{message}</FormAlert>
      {signingUp ? (
        <SignUpForm key="sign-up" email={email} action={text.createAndJoin} onSession={onSession} />
      ) : (
        <SignInForm key="sign-in" email={email} action={text.signInAndJoin} onSession={onSession} />
      )}
      <SocialButtons apps={settings?.socialApps} next={here} />
      {canSignUp && (
        <AuthLinks>
          <Button variant="link" onClick={() => setJoining(signingUp ? Joining.signIn : Joining.signUp)}>
            {signingUp ? t.signInInstead : text.createInstead}
          </Button>
        </AuthLinks>
      )}
    </AuthFrame>
  )
}
