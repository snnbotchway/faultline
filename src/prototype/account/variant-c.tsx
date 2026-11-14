// PROTOTYPE, throwaway. Variant C, "Summary and dialogs": the profile is one short read-only sheet of facts.
// Each row states where things stand and opens a dialog for the one task that changes it.
import type { ComponentProps, ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Flow, TOUCH, day, type Account } from './model'
import {
  Confirm,
  DetailsForm,
  EmailList,
  KeyForm,
  LinkedList,
  NotificationList,
  PasswordForm,
  ProtoShell,
  RecoveryStep,
  ThemePicker,
  TokenForm,
  TokenReveal,
  TokenRows,
  TotpScan,
} from './parts'

const ROW = 'flex min-h-11 w-full items-center gap-3 border-b py-1.5 text-left'

function Heading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-8 flex min-h-9 items-end justify-between gap-3 border-b pb-1.5 first:mt-5">
      <h2 className="label-caps">{children}</h2>
      {action}
    </div>
  )
}

// The whole row opens the task; the word at the right says which.
// Extra props pass through so a row can also be the trigger of a confirmation.
function Fact({ name, value, action, danger, ...props }: { name: string; value?: ReactNode; action: string; danger?: boolean } & Omit<ComponentProps<'button'>, 'name' | 'value'>) {
  return (
    <button type="button" className={cn(ROW, 'hover:bg-accent')} {...props}>
      <span className="w-36 shrink-0 text-muted-foreground sm:w-44">{name}</span>
      <span className="min-w-0 flex-1 truncate">{value}</span>
      <span className={cn('shrink-0 text-sm font-medium', danger ? 'text-destructive' : 'text-brand')}>{action}</span>
    </button>
  )
}

const TITLES: Record<Flow, string> = {
  [Flow.totpScan]: 'Turn on two-step verification',
  [Flow.totpCodes]: 'Turn on two-step verification',
  [Flow.key]: 'Add a security key',
  [Flow.regen]: 'New recovery codes',
  [Flow.tokenNew]: 'New API token',
  [Flow.details]: 'Name and time zone',
  [Flow.emails]: 'Emails',
  [Flow.password]: 'Password',
  [Flow.linked]: 'Linked accounts',
  [Flow.notifications]: 'Alert emails',
}
const STEPS: Partial<Record<Flow, string>> = { [Flow.totpScan]: 'Step 1 of 2', [Flow.totpCodes]: 'Step 2 of 2' }

function TaskBody({ account, flow }: { account: Account; flow: Flow }) {
  switch (flow) {
    case Flow.totpScan:
      return <TotpScan stack onNext={() => account.open(Flow.totpCodes)} onCancel={account.close} />
    case Flow.totpCodes:
      return <RecoveryStep action="Turn on" onDone={account.finishTotp} onCancel={account.close} />
    case Flow.key:
      return <KeyForm onAdd={account.addKey} onCancel={account.close} />
    case Flow.regen:
      return <RecoveryStep action="Replace old codes" onDone={account.finishRegen} onCancel={account.close} />
    case Flow.tokenNew:
      return <TokenForm onCreate={account.createToken} onCancel={account.close} />
    case Flow.details:
      return <DetailsForm account={account} onSaved={account.close} />
    case Flow.emails:
      return <EmailList account={account} />
    case Flow.password:
      return <PasswordForm account={account} onDone={account.close} />
    case Flow.linked:
      return <LinkedList account={account} />
    case Flow.notifications:
      return <NotificationList account={account} />
  }
}

const SHEET = 'max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-5 max-sm:top-3'

export function ProfileC({ account }: { account: Account }) {
  const { flow, emails, keys } = account
  const primary = emails.find((email) => email.isPrimary)?.email
  const unverified = emails.filter((email) => !email.isVerified).length
  const overrides = Object.values(account.alerts).filter((choice) => choice !== -1).length
  const open = (next: Flow) => () => account.open(next)

  return (
    <ProtoShell>
      <PageBar className="justify-between">
        <span className="font-semibold">Profile</span>
        <span className="mono truncate text-muted-foreground">{account.user.email}</span>
      </PageBar>
      <main className="mx-auto w-full max-w-[720px] px-3 pb-16 md:px-4">
        <h1 className="sr-only">Profile</h1>

        <Heading>Account</Heading>
        <Fact name="Name" value={account.name} action="Edit" onClick={open(Flow.details)} />
        <Fact name="Time zone" value={<span className="mono">{account.timezone}</span>} action="Edit" onClick={open(Flow.details)} />
        <Fact
          name="Emails"
          value={
            <>
              <span className="mono">{primary}</span>
              {emails.length > 1 && <span className="text-muted-foreground"> and {emails.length - 1} more</span>}
              {unverified > 0 && <span className="text-level-warning"> · {unverified} not verified</span>}
            </>
          }
          action="Manage"
          onClick={open(Flow.emails)}
        />
        <div className={cn(ROW, 'justify-between')}>
          <span className="w-36 shrink-0 text-muted-foreground sm:w-44">Theme</span>
          <ThemePicker />
        </div>

        <Heading>Sign-in</Heading>
        <Fact name="Password" value={account.user.hasPasswordAuth ? 'Set' : 'Not set'} action={account.user.hasPasswordAuth ? 'Change' : 'Set'} onClick={open(Flow.password)} />
        <Fact
          name="Linked accounts"
          value={account.identities.map((identity) => account.socialApps.find((app) => app.provider === identity.provider)?.name ?? identity.provider).join(', ') || 'None'}
          action="Manage"
          onClick={open(Flow.linked)}
        />

        <Heading>Two-step verification</Heading>
        {account.totpSince ? (
          <Confirm title="Turn off the authenticator app?" action="Turn off" onConfirm={account.turnOffTotp}>
            <Fact name="Authenticator app" value={<>On <span className="mono text-muted-foreground">since {day(account.totpSince)}</span></>} action="Turn off" />
          </Confirm>
        ) : (
          <Fact name="Authenticator app" value="Off" action="Turn on" onClick={open(Flow.totpScan)} />
        )}
        {keys.map((key) => (
          <Confirm key={key.id} title={`Remove ${key.name}?`} action="Remove key" onConfirm={() => account.removeKey(key.id)}>
            <Fact name="Security key" value={<>{key.name} <span className="mono text-muted-foreground">added {day(key.created_at)}</span></>} action="Remove" />
          </Confirm>
        ))}
        <Fact name={keys.length ? 'Another key' : 'Security keys'} value={keys.length ? '' : 'None'} action="Add" onClick={open(Flow.key)} />
        {account.codesLeft !== null && (
          <Fact name="Recovery codes" value={<span className="mono">{account.codesLeft} of 10 left</span>} action="New codes" onClick={open(Flow.regen)} />
        )}

        <Heading>Notifications</Heading>
        <Fact
          name="Alert emails"
          value={
            <>
              {account.alertDefault ? 'On' : 'Off'}
              {overrides > 0 && <span className="text-muted-foreground"> · {overrides} projects set differently</span>}
            </>
          }
          action="Change"
          onClick={open(Flow.notifications)}
        />

        <Heading
          action={
            <Button size="sm" className={TOUCH} onClick={open(Flow.tokenNew)}>
              New token
            </Button>
          }
        >
          API tokens
        </Heading>
        <div className="-mt-px">
          <TokenRows account={account} />
        </div>

        <div className="mt-8 border-t">
          <Confirm title="Delete your account and everything only you own?" action="Delete account" onConfirm={() => {}}>
            <Fact name="Delete account" action="Delete" danger />
          </Confirm>
        </div>
      </main>

      <Dialog open={flow !== null} onOpenChange={(next) => !next && account.close()}>
        {flow && (
          <DialogContent
            className={SHEET}
            aria-describedby={undefined}
            // Start in the field the task is about, not on its first button.
            onOpenAutoFocus={(event) => {
              const field = (event.currentTarget as HTMLElement).querySelector('input')
              if (!field) return
              event.preventDefault()
              field.focus()
            }}
          >
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <DialogTitle>{TITLES[flow]}</DialogTitle>
              {STEPS[flow] && <span className="label-caps shrink-0">{STEPS[flow]}</span>}
            </div>
            <TaskBody account={account} flow={flow} />
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={account.created !== null} onOpenChange={(next) => !next && account.dismissCreated()}>
        {account.created && (
          <DialogContent className={cn(SHEET, 'p-0')} aria-describedby={undefined} onInteractOutside={(event) => event.preventDefault()}>
            <DialogTitle className="sr-only">Token created</DialogTitle>
            <TokenReveal token={account.created} onDone={account.dismissCreated} />
          </DialogContent>
        )}
      </Dialog>
    </ProtoShell>
  )
}
