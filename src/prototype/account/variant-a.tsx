// PROTOTYPE, throwaway. Variant A, "Ledger": the whole profile is one ruled page.
// The stock paths (/profile/multi-factor-auth, /profile/auth-tokens, …) scroll to their band, and every task unfolds in place.
import { useEffect, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
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

function Band({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-11 gap-x-8 gap-y-3 border-b py-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <h2 className="label-caps lg:pt-1">{label}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Item({ title, status, action, children }: { title: string; status?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-medium">{title}</h3>
        {status}
        <span className="ml-auto">{action}</span>
      </div>
      {children && <div className="pt-3">{children}</div>}
    </div>
  )
}

const Step = ({ children }: { children: ReactNode }) => <p className="label-caps mb-3">{children}</p>

export function ProfileA({ account }: { account: Account }) {
  const { flow } = account
  useEffect(() => {
    if (account.section === Section.account) return
    // Only on arrival: the path picks the band. Deferred so it runs after the router has reset the scroll position.
    const timer = setTimeout(() => document.getElementById(account.section)?.scrollIntoView(), 50)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ProtoShell>
      <PageBar className="gap-5 overflow-x-auto">
        <span className="font-semibold">Profile</span>
        <nav className="flex h-full items-stretch gap-4" aria-label="Profile sections">
          {SECTIONS.map((section) => (
            <a key={section.key} href={`#${section.key}`} className="flex items-center text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground">
              {section.label}
            </a>
          ))}
        </nav>
      </PageBar>
      <main className="mx-auto w-full max-w-[920px] px-3 pb-16 md:px-4">
        <h1 className="sr-only">Profile</h1>
        <Band id={Section.account} label="Account">
          <DetailsForm account={account} />
          <p className="mt-5 mb-1.5 text-sm font-medium">Theme</p>
          <ThemePicker />
        </Band>
        <Band label="Emails">
          <EmailList account={account} />
        </Band>
        <Band label="Password">
          <PasswordForm account={account} />
        </Band>
        <Band label="Linked accounts">
          <LinkedList account={account} />
        </Band>

        <Band id={Section.mfa} label="Two-step verification">
          <Item
            title="Authenticator app"
            status={account.totpSince ? <Tag tone="ok">On</Tag> : <Tag>Off</Tag>}
            action={
              account.totpSince ? (
                <Confirm title="Turn off the authenticator app?" action="Turn off" onConfirm={account.turnOffTotp}>
                  <Button className={TOUCH}>Turn off</Button>
                </Confirm>
              ) : (
                flow !== Flow.totpScan && flow !== Flow.totpCodes && (
                  <Button className={TOUCH} onClick={() => account.open(Flow.totpScan)}>
                    Turn on
                  </Button>
                )
              )
            }
          >
            {flow === Flow.totpScan && (
              <>
                <Step>Step 1 of 2 · Scan with your app</Step>
                <TotpScan onNext={() => account.open(Flow.totpCodes)} onCancel={account.close} />
              </>
            )}
            {flow === Flow.totpCodes && (
              <>
                <Step>Step 2 of 2 · Save your recovery codes</Step>
                <RecoveryStep action="Turn on" onDone={account.finishTotp} onCancel={account.close} />
              </>
            )}
            {!flow && account.totpSince && <p className="mono text-muted-foreground">since {day(account.totpSince)}</p>}
          </Item>
          <Item
            title="Security keys"
            status={account.keys.length === 0 && <Tag>None</Tag>}
            action={
              flow !== Flow.key && (
                <Button className={TOUCH} onClick={() => account.open(Flow.key)}>
                  Add security key
                </Button>
              )
            }
          >
            {account.keys.length > 0 && <KeyRows account={account} />}
            {flow === Flow.key && (
              <div className={account.keys.length > 0 ? 'pt-4' : ''}>
                <KeyForm onAdd={account.addKey} onCancel={account.close} />
              </div>
            )}
          </Item>
          {account.codesLeft !== null && (
            <Item
              title="Recovery codes"
              status={<span className="mono text-muted-foreground">{account.codesLeft} of 10 left</span>}
              action={
                flow !== Flow.regen && (
                  <Button className={TOUCH} onClick={() => account.open(Flow.regen)}>
                    New codes
                  </Button>
                )
              }
            >
              {flow === Flow.regen && <RecoveryStep action="Replace old codes" onDone={account.finishRegen} onCancel={account.close} />}
            </Item>
          )}
        </Band>

        <Band id={Section.notifications} label="Notifications">
          <NotificationList account={account} />
        </Band>

        <Band id={Section.tokens} label="API tokens">
          <div className="space-y-4">
            {account.created && <TokenReveal token={account.created} onDone={account.dismissCreated} />}
            {flow === Flow.tokenNew ? (
              <div className="border bg-card p-4">
                <TokenForm onCreate={account.createToken} onCancel={account.close} />
              </div>
            ) : (
              <Button className={TOUCH} onClick={() => account.open(Flow.tokenNew)}>
                New token
              </Button>
            )}
            <TokenRows account={account} />
          </div>
        </Band>

        <Band label="Delete account">
          <Confirm title="Delete your account and everything only you own?" action="Delete account" onConfirm={() => {}}>
            <Button variant="destructive" className={TOUCH}>
              Delete account
            </Button>
          </Confirm>
        </Band>
      </main>
    </ProtoShell>
  )
}
