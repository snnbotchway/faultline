// PROTOTYPE, throwaway. Variant D, the picked mix: C's summary sheet, with the review's defects fixed.
//   - a stock path lands somewhere: /profile/notifications opens its dialog, the two-step and token paths mark their section
//   - on a phone a task is a bottom sheet with its actions pinned in thumb reach
//   - nothing is cut off: values wrap, the new token shows in full, scopes read as words
import { useEffect, type ComponentProps, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Flow, Section, TOUCH, day, type Account } from './model'
import {
  Confirm,
  CopyButton,
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
  TotpScan,
} from './parts'
import { RELEASES_SCOPE, SCOPE_RESOURCES } from './stub'

const ROW = 'flex min-h-11 w-full items-center gap-3 border-b py-1.5 text-left'
const NAME = 'w-36 shrink-0 text-muted-foreground sm:w-44'
const ACTION = 'shrink-0 text-sm font-medium text-brand'

// `current` marks the section a stock path points at.
function Heading({ id, current, children, action }: { id?: string; current?: boolean; children: ReactNode; action?: ReactNode }) {
  return (
    <div id={id} className={cn('-mx-2 mt-8 flex min-h-9 scroll-mt-14 items-end justify-between gap-3 border-b px-2 pb-1.5 first:mt-5', current && 'bg-selected pt-1.5')}>
      <h2 className={cn('label-caps', current && 'font-semibold text-foreground')}>{children}</h2>
      {action}
    </div>
  )
}

// The whole row opens the task; the word at the right says which. Extra props let a row be a confirmation's trigger.
function Fact({ name, value, action, danger, ...props }: { name: string; value?: ReactNode; action: string; danger?: boolean } & Omit<ComponentProps<'button'>, 'name' | 'value'>) {
  return (
    <button type="button" className={cn(ROW, 'hover:bg-accent')} {...props}>
      <span className={NAME}>{name}</span>
      <span className="min-w-0 flex-1">{value}</span>
      <span className={cn(ACTION, danger && 'text-destructive')}>{action}</span>
    </button>
  )
}

// `project:read project:write project:releases` in the words of the form that made it.
function scopeWords(scopes: string[]) {
  const parts = SCOPE_RESOURCES.flatMap((resource) => {
    const levels = scopes.filter((scope) => scope.startsWith(`${resource.key}:`) && scope !== RELEASES_SCOPE).map((scope) => scope.split(':')[1] ?? '')
    const words = levels.length ? [`${resource.label}: ${levels.map((level) => level[0]?.toUpperCase() + level.slice(1)).join(', ')}`] : []
    return resource.key === 'project' && scopes.includes(RELEASES_SCOPE) ? [...words, 'Releases'] : words
  })
  return parts.join(' · ')
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
  [Flow.notifications]: 'Notifications',
}
// Lists change as you go and have no button of their own to finish on, so the sheet gets one.
const LISTS: Flow[] = [Flow.emails, Flow.linked, Flow.notifications]
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

// A dialog on a desktop. On a phone, a sheet from the bottom edge: the page's bars stay visible above it,
// the task's buttons are pinned along the bottom, and the code field and the key's line use the full width.
const SHEET = cn(
  'max-h-[calc(100dvh-6rem)] overflow-y-auto p-5',
  'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[calc(100dvh-5.5rem)] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:border-x-0 max-sm:border-b-0 max-sm:data-[state=open]:slide-in-from-bottom-4',
  // The pinned buttons carry the sheet's bottom padding, so they can sit flush with its edge.
  'max-sm:pb-0 max-sm:[&_[data-actions]]:sticky max-sm:[&_[data-actions]]:bottom-0 max-sm:[&_[data-actions]]:-mx-5 max-sm:[&_[data-actions]]:border-t max-sm:[&_[data-actions]]:bg-popover max-sm:[&_[data-actions]]:px-5 max-sm:[&_[data-actions]]:pt-3 max-sm:[&_[data-actions]]:pb-5',
  'max-sm:[&_[data-actions]>*]:flex-1 max-sm:[&_input[name=code]]:max-w-none max-sm:[&_[data-key-line]]:flex-nowrap',
)

export function ProfileD({ account }: { account: Account }) {
  const { flow, emails, keys, section } = account
  const primary = emails.find((email) => email.isPrimary)?.email
  const unverified = emails.filter((email) => !email.isVerified).length
  const overrides = Object.values(account.alerts).filter((choice) => choice !== -1).length
  const open = (next: Flow) => () => account.open(next)

  useEffect(() => {
    // On arrival the path picks where to land: /profile/notifications is a dialog, the others are sections of the sheet.
    if (section === Section.notifications) account.open(Flow.notifications)
    else if (section !== Section.account) {
      const timer = setTimeout(() => document.getElementById(section)?.scrollIntoView(), 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
              <span className="mono break-all">{primary}</span>{' '}
              <span className="whitespace-nowrap">
                {emails.length > 1 && <span className="text-muted-foreground">+{emails.length - 1}</span>}
                {unverified > 0 && <span className="text-level-warning"> · {unverified} not verified</span>}
              </span>
            </>
          }
          action="Manage"
          onClick={open(Flow.emails)}
        />
        <div className={cn(ROW, 'justify-between')}>
          <span className="shrink-0 text-muted-foreground">Theme</span>
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

        <Heading id={Section.mfa} current={section === Section.mfa}>
          Two-step verification
        </Heading>
        {account.totpSince ? (
          <Confirm title="Turn off the authenticator app?" action="Turn off" onConfirm={account.turnOffTotp}>
            <Fact
              name="Authenticator app"
              value={
                <>
                  On <span className="mono whitespace-nowrap text-muted-foreground">since {day(account.totpSince)}</span>
                </>
              }
              action="Turn off"
            />
          </Confirm>
        ) : (
          <Fact name="Authenticator app" value="Off" action="Turn on" onClick={open(Flow.totpScan)} />
        )}
        {/* One row for all keys: each key can be removed, and the row's action adds another. */}
        <div className={cn(ROW, 'items-start')}>
          <span className={cn(NAME, 'py-1.5')}>Security keys</span>
          <span className="min-w-0 flex-1">
            {keys.length === 0 && <span className="block py-1.5">None</span>}
            {keys.map((key) => (
              <span key={key.id} className="flex flex-wrap items-center gap-x-3 py-1.5">
                <span>{key.name}</span>
                <span className="mono text-muted-foreground">added {day(key.created_at)}</span>
                <Confirm title={`Remove ${key.name}?`} action="Remove key" onConfirm={() => account.removeKey(key.id)}>
                  <button type="button" className={cn(ACTION, 'hover:underline max-lg:min-h-11')}>
                    Remove
                  </button>
                </Confirm>
              </span>
            ))}
          </span>
          <button type="button" className={cn(ACTION, 'min-h-8 hover:underline max-lg:min-h-11')} onClick={open(Flow.key)}>
            Add
          </button>
        </div>
        {account.codesLeft !== null && (
          <Fact name="Recovery codes" value={<span className="mono">{account.codesLeft} of 10 left</span>} action="New codes" onClick={open(Flow.regen)} />
        )}

        <Heading>Notifications</Heading>
        <Fact
          name="Alert emails"
          value={
            <>
              {account.alertDefault ? 'On' : 'Off'}
              {overrides > 0 && <span className="text-muted-foreground"> · {overrides} projects differ</span>}
            </>
          }
          action="Change"
          onClick={open(Flow.notifications)}
        />

        <Heading
          id={Section.tokens}
          current={section === Section.tokens}
          action={
            <Button size="sm" className={TOUCH} onClick={open(Flow.tokenNew)}>
              New token
            </Button>
          }
        >
          API tokens
        </Heading>
        {account.tokens.length === 0 && <p className="prose-text border-b py-3 text-muted-foreground">No tokens. Create one to use the API or the command-line tools.</p>}
        <ul>
          {account.tokens.map((token) => (
            <li key={token.id} className="flex items-center gap-3 border-b py-2">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-medium">{token.label}</span>
                  <span className="mono text-muted-foreground">
                    {token.token.slice(0, 6)}… · {day(token.created)}
                  </span>
                </span>
                <span className="block text-sm text-muted-foreground">{scopeWords(token.scopes)}</span>
              </span>
              <Confirm title={`Revoke ${token.label}?`} action="Revoke token" onConfirm={() => account.revokeToken(token.id)}>
                <Button className={TOUCH}>Revoke</Button>
              </Confirm>
            </li>
          ))}
        </ul>

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
            // Start in the field the task is about; a list (emails, alert emails) starts on the sheet itself.
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              const sheet = event.currentTarget as HTMLElement
              const field = LISTS.includes(flow) ? null : sheet.querySelector('input')
              ;(field ?? sheet).focus()
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <DialogTitle>{TITLES[flow]}</DialogTitle>
              {STEPS[flow] && <span className="label-caps shrink-0">{STEPS[flow]}</span>}
              {LISTS.includes(flow) && (
                <DialogClose asChild>
                  <Button size="sm" className={TOUCH}>
                    Done
                  </Button>
                </DialogClose>
              )}
            </div>
            <div className="max-sm:pb-5 max-sm:has-[[data-actions]]:pb-0">
              <TaskBody account={account} flow={flow} />
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={account.created !== null} onOpenChange={(next) => !next && account.dismissCreated()}>
        {account.created && (
          <DialogContent
            className={SHEET}
            aria-describedby={undefined}
            onInteractOutside={(event) => event.preventDefault()}
            // No button is focused on arrival, so the focus outline is not mistaken for a warning.
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              ;(event.currentTarget as HTMLElement).focus()
            }}
          >
            <DialogTitle>
              Copy <span className="font-semibold">{account.created.label}</span> now
            </DialogTitle>
            <p className="prose-text mt-1 text-muted-foreground">It won't be shown again.</p>
            <code className="mono mt-4 block border bg-code px-3 py-2.5 break-all select-all">{account.created.token}</code>
            <div data-actions className="mt-4 flex flex-wrap gap-2">
              <CopyButton text={account.created.token} label="Copy token" variant="default" className="h-10" />
              <Button className={cn('h-10', TOUCH)} onClick={account.dismissCreated}>
                Done
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </ProtoShell>
  )
}
