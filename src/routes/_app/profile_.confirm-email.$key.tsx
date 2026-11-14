import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { accountKeys } from '@/api/account'
import { auth } from '@/api/auth'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { AccountShell } from '@/features/account/shell'
import { notify } from '@/lib/notice'
import { useTitle } from '@/lib/title'

// The link in a verification email.
export const Route = createFileRoute('/_app/profile_/confirm-email/$key')({ component: ConfirmEmail })

function ConfirmEmail() {
  useTitle('Verify email')
  const { key } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // A query, so opening the link verifies once however often the screen renders.
  const verified = useQuery({ queryKey: ['auth', 'verify-email', key], queryFn: () => auth.verifyEmail(key), staleTime: Infinity, gcTime: 0, retry: false })

  useEffect(() => {
    if (!verified.isSuccess) return
    void queryClient.invalidateQueries({ queryKey: accountKeys.emails })
    notify('Email verified.')
    void navigate({ to: '/profile', replace: true })
  }, [verified.isSuccess, queryClient, navigate])

  return (
    <AccountShell>
      <PageBar>
        <span className="font-semibold">Profile</span>
      </PageBar>
      {verified.isError ? (
        <Screen title="This link has expired or was already used">
          <p className="prose-text text-muted-foreground">Send a new one from your emails.</p>
          <Button asChild className="max-lg:h-11">
            <Link to="/profile">Open profile</Link>
          </Button>
        </Screen>
      ) : (
        <Screen title="Verifying your email" />
      )}
    </AccountShell>
  )
}
