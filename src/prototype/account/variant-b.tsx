// PROTOTYPE, throwaway. Variant B, "Tabbed pages": each stock path is its own page, switched by tabs in the page bar.
// A multi-step task (two-step setup, new token) takes over the page until it is finished or cancelled.
import type { ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Flow, SECTIONS, Section, TOUCH, day, type Account } from './model'
import {
  Confirm,
  DetailsForm,
  EmailList,
  KeyForm,
  KeyRows,
  LinkedList,
  NotificationList,
  PasswordForm,
  ProtoShell,
  RecoveryStep,
  Tag,
  ThemePicker,
  TokenForm,
  TokenReveal,
  TokenRows,
  TotpScan,
} from './parts'

const SHORT: Partial<Record<Section, string>> = { [Section.mfa]: 'Two-step' }

function Group({ title, aside, action, children }: { title: string; aside?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b py-6 last:border-b-0">
      <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', children ? 'mb-4' : '')}>
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside}
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </section>
  )
}

// A task that owns the page: its name, where you are in it, and the step itself.
function Task({ title, steps, current, children }: { title: string; steps?: string[]; current?: number; children: ReactNode }) {
  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      {steps && (
        <ol className="mt-4 flex border-b">
          {steps.map((step, index) => (
            <li
              key={step}
              aria-current={index === current ? 'step' : undefined}
              className={cn('-mb-px flex h-10 flex-1 items-center gap-2 border-b-2 text-sm', index === current ? 'border-brand font-semibold' : 'border-transparent text-muted-foreground')}
            >
              <span className="mono">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      )}
      <div className="pt-6">{children}</div>
    </div>
  )
}

const TOTP_STEPS = ['Scan with your app', 'Save recovery codes']

function Mfa({ account }: { account: Account }) {
  switch (account.flow) {
    case Flow.totpScan:
      return (
        <Task title="Turn on two-step verification" steps={TOTP_STEPS} current={0}>
          <TotpScan onNext={() => account.open(Flow.totpCodes)} onCancel={account.close} />
        </Task>
      )
    case Flow.totpCodes:
      return (
        <Task title="Turn on two-step verification" steps={TOTP_STEPS} current={1}>
          <RecoveryStep action="Turn on" onDone={account.finishTotp} onCancel={account.close} />
        </Task>
      )
    case Flow.key:
      return (
        <Task title="Add a security key">
          <KeyForm onAdd={account.addKey} onCancel={account.close} />
        </Task>
      )
    case Flow.regen:
      return (
        <Task title="New recovery codes">
          <RecoveryStep action="Replace old codes" onDone={account.finishRegen} onCancel={account.close} />
        </Task>
      )
  }
  return (
    <>
      <Group
        title="Authenticator app"
        aside={
          account.totpSince ? (
            <>
              <Tag tone="ok">On</Tag>
              <span className="mono text-muted-foreground">since {day(account.totpSince)}</span>
            </>
          ) : (
            <Tag>Off</Tag>
          )
        }
        action={
          account.totpSince ? (
            <Confirm title="Turn off the authenticator app?" action="Turn off" onConfirm={account.turnOffTotp}>
              <Button className={TOUCH}>Turn off</Button>
            </Confirm>
          ) : (
            <Button variant="default" className={TOUCH} onClick={() => account.open(Flow.totpScan)}>
              Turn on
            </Button>
          )
        }
      />
      <Group
        title="Security keys"
        aside={account.keys.length === 0 && <Tag>None</Tag>}
        action={
          <Button className={TOUCH} onClick={() => account.open(Flow.key)}>
            Add security key
          </Button>
        }
      >
        {account.keys.length > 0 && <KeyRows account={account} />}
      </Group>
      {account.codesLeft !== null && (
        <Group
          title="Recovery codes"
          aside={<span className="mono text-muted-foreground">{account.codesLeft} of 10 left</span>}
          action={
            <Button className={TOUCH} onClick={() => account.open(Flow.regen)}>
              New codes
            </Button>
          }
        />
      )}
    </>
  )
}

function Tokens({ account }: { account: Account }) {
  if (account.flow === Flow.tokenNew)
    return (
      <Task title="New API token">
        <TokenForm onCreate={account.createToken} onCancel={account.close} />
      </Task>
    )
  return (
    <Group
      title="API tokens"
      action={
        <Button variant={account.created ? 'outline' : 'default'} className={TOUCH} onClick={() => account.open(Flow.tokenNew)}>
          New token
        </Button>
      }
    >
      <div className="space-y-4">
        {account.created && <TokenReveal token={account.created} onDone={account.dismissCreated} />}
        <TokenRows account={account} />
      </div>
    </Group>
  )
}

function AccountPage({ account }: { account: Account }) {
  return (
    <>
      <Group title="Details">
        <DetailsForm account={account} />
        <p className="mt-5 mb-1.5 text-sm font-medium">Theme</p>
        <ThemePicker />
      </Group>
      <Group title="Emails">
        <EmailList account={account} />
      </Group>
      <Group title="Password">
        <PasswordForm account={account} />
      </Group>
      <Group title="Linked accounts">
        <LinkedList account={account} />
      </Group>
      <Group
        title="Delete account"
        action={
          <Confirm title="Delete your account and everything only you own?" action="Delete account" onConfirm={() => {}}>
            <Button variant="destructive" className={TOUCH}>
              Delete account
            </Button>
          </Confirm>
        }
      />
    </>
  )
}

export function ProfileB({ account }: { account: Account }) {
  const { section } = account
  return (
    <ProtoShell>
      <PageBar className="gap-4 overflow-x-auto">
        <nav className="flex h-full items-stretch gap-4" aria-label="Profile">
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={item.key === section ? 'page' : undefined}
              onClick={() => account.setSection(item.key)}
              className={cn('flex items-center border-y-2 border-transparent text-sm font-medium whitespace-nowrap', item.key === section ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}
            >
              <span className={SHORT[item.key] ? 'max-sm:hidden' : ''}>{item.label}</span>
              {SHORT[item.key] && <span className="sm:hidden">{SHORT[item.key]}</span>}
            </button>
          ))}
        </nav>
      </PageBar>
      <main className="mx-auto w-full max-w-[720px] px-3 pb-16 md:px-4">
        {section === Section.account && <AccountPage account={account} />}
        {section === Section.mfa && <Mfa account={account} />}
        {section === Section.notifications && (
          <Group title="Notifications">
            <NotificationList account={account} />
          </Group>
        )}
        {section === Section.tokens && <Tokens account={account} />}
      </main>
    </ProtoShell>
  )
}
