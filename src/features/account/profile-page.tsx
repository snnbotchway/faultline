import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertChoice, accountKeys, alertsQuery, emailsQuery, notificationsQuery, tokensQuery, twoStep, twoStepQuery, type ApiToken } from '@/api/account'
import { Feature, currentUserQuery, instanceSettingsQuery } from '@/api/organizations'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/task-dialog'
import { Theme, setTheme, useTheme } from '@/lib/theme'
import { useTitle } from '@/lib/title'
import { DeleteAccountDialog } from './delete-dialog'
import { DetailsDialog } from './details-dialog'
import { EmailsDialog } from './emails-dialog'
import { day, providerName } from './format'
import { LANDING_PATHS, Landing } from './landing'
import { LinkedDialog } from './linked-dialog'
import { NotificationsDialog } from './notifications-dialog'
import { PasswordDialog } from './password-dialog'
import { ControlRow, Fact, Heading } from './rows'
import { NewTokenDialog, TokenRevealDialog, TokenRows } from './tokens'
import { KeysDialog, RecoveryDialog, TotpDialog, VerifyFirstDialog } from './two-step-dialogs'
import { useAction } from './use-action'

// The tasks that have no path of their own.
const Task = {
  details: 'details',
  emails: 'emails',
  password: 'password',
  linked: 'linked',
  totp: 'totp',
  totpOff: 'totpOff',
  keys: 'keys',
  recovery: 'recovery',
  verifyFirst: 'verifyFirst',
  delete: 'delete',
} as const
type Task = (typeof Task)[keyof typeof Task]

const THEMES = [
  { value: Theme.system, label: 'System' },
  { value: Theme.light, label: 'Light' },
  { value: Theme.dark, label: 'Dark' },
] as const

const SECTION_IDS = { [Landing.twoStep]: 'two-step', [Landing.tokens]: 'api-tokens' } as const

export function ProfileSkeleton() {
  return (
    <>
      <PageBar>
        <span className="font-semibold">Profile</span>
      </PageBar>
      <div className="mx-auto w-full max-w-180 space-y-3 px-3 pt-8 md:px-4" aria-busy>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    </>
  )
}

export function ProfilePage({ landing, connectFailed }: { landing: Landing; connectFailed?: boolean }) {
  useTitle('Profile')
  const navigate = useNavigate()
  const user = useQuery(currentUserQuery).data
  const emails = useQuery(emailsQuery).data
  const factors = useQuery(twoStepQuery).data
  const tokenList = useQuery(tokensQuery).data
  const defaults = useQuery(notificationsQuery).data
  const alerts = useQuery(alertsQuery).data
  const settings = useQuery(instanceSettingsQuery).data
  const theme = useTheme()
  const [task, setTask] = useState<Task | null>(null)
  const [created, setCreated] = useState<ApiToken | null>(null)
  const close = () => setTask(null)
  const open = (next: Task) => () => setTask(next)
  const land = (next: Landing) => void navigate({ to: LANDING_PATHS[next], replace: true })

  const turnOff = useAction(twoStep.deactivateTotp, { action: 'turn off the authenticator app', refresh: [accountKeys.authenticators], onDone: close })

  const section = landing === Landing.twoStep || landing === Landing.tokens ? SECTION_IDS[landing] : undefined
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' })
  }, [section, user])

  if (!user || !emails || !factors || !tokenList) return <ProfileSkeleton />

  const primary = emails.find((email) => email.isPrimary)?.email ?? user.email
  const unverifiedEmails = emails.filter((email) => !email.isVerified).map((email) => email.email)
  const unverified = unverifiedEmails.length
  const canSend = settings?.enabledFeatures.includes(Feature.email) ?? true
  const apps = settings?.socialApps ?? []
  // The backend turns two-step verification down while any address is unverified.
  const twoStepTask = (wanted: Task) => open(unverified === 0 ? wanted : Task.verifyFirst)
  const changed = Object.values(alerts ?? {}).filter((choice) => choice !== AlertChoice.inherit).length
  const alertsOn = defaults?.subscribeByDefault !== false

  return (
    <>
      <PageBar className="justify-between">
        <span className="font-semibold">Profile</span>
        <span className="mono truncate text-muted-foreground">{user.email}</span>
      </PageBar>
      <main className="mx-auto w-full max-w-180 px-3 pb-16 md:px-4">
        <h1 className="sr-only">Profile</h1>
        {connectFailed && <FormAlert className="mt-5">That account couldn't be connected. Try again.</FormAlert>}

        <Heading>Account</Heading>
        <Fact name="Name" value={user.name || <span className="text-muted-foreground">Not set</span>} action="Edit" onClick={open(Task.details)} />
        <Fact
          name="Time zone"
          value={user.options.timezone ? <span className="mono">{user.options.timezone}</span> : <span className="text-muted-foreground">Not set</span>}
          action="Edit"
          onClick={open(Task.details)}
        />
        <Fact
          name="Emails"
          value={
            <>
              <span className="mono [overflow-wrap:anywhere]">{primary}</span>{' '}
              <span className="whitespace-nowrap">
                {emails.length > 1 && <span className="text-muted-foreground">+{emails.length - 1}</span>}
                {unverified > 0 && (
                  <span className="text-level-warning">
                    {emails.length > 1 ? ' · ' : ''}
                    {unverified === 1 && emails.length === 1 ? 'not verified' : `${unverified} not verified`}
                  </span>
                )}
              </span>
            </>
          }
          action="Manage"
          onClick={open(Task.emails)}
        />
        <ControlRow name="Theme">
          <Segmented label="Theme" value={theme} options={THEMES} onChange={setTheme} />
        </ControlRow>

        <Heading>Sign-in</Heading>
        <Fact name="Password" value={user.hasPasswordAuth ? 'Set' : 'Not set'} action={user.hasPasswordAuth ? 'Change' : 'Set'} onClick={open(Task.password)} />
        {(apps.length > 0 || user.identities.length > 0) && (
          <Fact
            name="Linked accounts"
            value={user.identities.map((identity) => providerName(apps, identity.provider)).join(', ') || 'None'}
            action={user.identities.length > 0 ? 'Manage' : 'Connect'}
            onClick={open(Task.linked)}
          />
        )}

        <Heading id={SECTION_IDS[Landing.twoStep]} current={landing === Landing.twoStep}>
          Two-step verification
        </Heading>
        {factors.totp ? (
          <Fact
            name="Authenticator app"
            value={
              <>
                On <span className="mono whitespace-nowrap text-muted-foreground">since {day(factors.totp.created_at)}</span>
              </>
            }
            action="Turn off"
            onClick={open(Task.totpOff)}
          />
        ) : (
          <Fact name="Authenticator app" value="Off" action="Turn on" onClick={twoStepTask(Task.totp)} />
        )}
        <Fact
          name="Security keys"
          value={factors.keys.map((key) => key.name).join(', ') || 'None'}
          action={factors.keys.length > 0 ? 'Manage' : 'Add'}
          onClick={factors.keys.length > 0 ? open(Task.keys) : twoStepTask(Task.keys)}
        />
        {factors.recovery && (
          <Fact
            name="Recovery codes"
            value={
              <span className="mono">
                {factors.recovery.unused_code_count} of {factors.recovery.total_code_count} left
              </span>
            }
            action="New codes"
            onClick={open(Task.recovery)}
          />
        )}

        <Heading>Notifications</Heading>
        <Fact
          name="Alert emails"
          value={
            <>
              {alertsOn ? 'On' : 'Off'}
              {changed > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  · {changed} {changed === 1 ? 'project' : 'projects'} changed
                </span>
              )}
            </>
          }
          action="Change"
          onClick={() => land(Landing.notifications)}
        />

        <Heading
          id={SECTION_IDS[Landing.tokens]}
          current={landing === Landing.tokens || landing === Landing.newToken}
          action={
            <Button size="sm" className="max-lg:h-11" onClick={() => land(Landing.newToken)}>
              New token
            </Button>
          }
        >
          API tokens
        </Heading>
        <TokenRows list={tokenList} />

        <div className="mt-8 border-t">
          <Fact name="Delete account" action="Delete" danger onClick={open(Task.delete)} />
        </div>
      </main>

      <DetailsDialog open={task === Task.details} onClose={close} user={user} />
      <EmailsDialog open={task === Task.emails} onClose={close} emails={emails} canSend={canSend} />
      <PasswordDialog open={task === Task.password} onClose={close} hasPassword={user.hasPasswordAuth} />
      <LinkedDialog open={task === Task.linked} onClose={close} linked={user.identities} apps={apps} />
      <TotpDialog open={task === Task.totp} onClose={close} />
      <KeysDialog open={task === Task.keys} onClose={close} keys={factors.keys} />
      <RecoveryDialog open={task === Task.recovery} onClose={close} />
      <VerifyFirstDialog open={task === Task.verifyFirst} onClose={close} emails={unverifiedEmails} canSend={canSend} />
      <ConfirmDialog
        open={task === Task.totpOff}
        onClose={close}
        title="Turn off the authenticator app?"
        description={factors.keys.length > 0 ? undefined : 'Signing in will then need only your password.'}
        action="Turn off"
        busy={turnOff.busy}
        error={turnOff.message}
        onConfirm={() => void turnOff.run()}
      />
      <DeleteAccountDialog open={task === Task.delete} onClose={close} userId={user.id} />

      <NotificationsDialog open={landing === Landing.notifications} onClose={() => land(Landing.top)} />
      <NewTokenDialog
        open={landing === Landing.newToken}
        onClose={() => land(Landing.tokens)}
        onCreated={(token) => {
          setCreated(token)
          land(Landing.tokens)
        }}
      />
      <TokenRevealDialog token={created} onClose={() => setCreated(null)} />
    </>
  )
}
