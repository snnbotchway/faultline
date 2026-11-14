import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { connectWizard } from '@/api/account'
import { SessionStatus, sessionQuery } from '@/api/auth'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/ui/field'
import { AccountShell } from '@/features/account/shell'
import { useAction } from '@/features/account/use-action'
import { useTitle } from '@/lib/title'

// The link a command-line setup wizard prints. Opening it lets that wizard act as the signed-in person.
export const Route = createFileRoute('/_app/profile_/wizard/$hash')({ component: Wizard })

function Wizard() {
  useTitle('Setup wizard')
  const { hash } = Route.useParams()
  const session = useQuery(sessionQuery).data
  const email = session?.status === SessionStatus.authenticated ? (session.user.email ?? session.user.display) : ''
  const [connected, setConnected] = useState(false)
  // Asked for, not done on arrival: whoever started the wizard gets a token for this account.
  const connect = useAction(() => connectWizard(hash), { action: 'connect the wizard. Run it again for a new link', onDone: () => setConnected(true) })

  return (
    <AccountShell>
      <PageBar>
        <span className="font-semibold">Setup wizard</span>
      </PageBar>
      {connected ? (
        <Screen title="Connected. Go back to your terminal." />
      ) : (
        <Screen title="Let the setup wizard in your terminal use your account?">
          <p className="mono [overflow-wrap:anywhere] text-muted-foreground">{email}</p>
          <FormAlert>{connect.error}</FormAlert>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="default" className="max-lg:h-11" disabled={connect.busy} aria-busy={connect.busy} onClick={() => void connect.run()}>
              Connect the wizard
            </Button>
            <Button asChild className="max-lg:h-11">
              <Link to="/">Cancel</Link>
            </Button>
          </div>
        </Screen>
      )}
    </AccountShell>
  )
}
