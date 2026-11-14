// PROTOTYPE, throwaway. The signed-out family (sign up, reset, invite, two-step at sign-in) in three frames:
//   A  the existing /login page repeated: one page per flow, links between them
//   B  one box; sign in and create account are tabs of it, and the second step picks its method by tab
//   C  the app's top bar with a plain column; providers first, and choices unfold as rows
import { ChevronDown, KeyRound, LifeBuoy, Smartphone } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Mark, Wordmark } from '@/components/mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TOUCH, useGo, type ScreenKey } from './model'
import { Field, PasswordInput } from './parts'
import { INVITE, SOCIAL_APPS, USER } from './stub'

const WIDE = cn('h-10 w-full', TOUCH)
const org = INVITE.orgUser.organization.name

type LinkTo = { label: string; to: ScreenKey }
type Content = { title: string; body: ReactNode; links?: LinkTo[] }

function useSubmit(next: ScreenKey) {
  const go = useGo()
  return (event: FormEvent) => {
    event.preventDefault()
    go(next)
  }
}

function Submit({ children }: { children: ReactNode }) {
  return (
    <Button type="submit" variant="default" className={WIDE}>
      {children}
    </Button>
  )
}

function Links({ links }: { links?: LinkTo[] }) {
  const go = useGo()
  if (!links?.length) return null
  return (
    <div className="mt-6 flex flex-wrap justify-between gap-x-6 gap-y-2">
      {links.map((link) => (
        <Button key={link.label} variant="link" className="max-lg:min-h-11" onClick={() => go(link.to)}>
          {link.label}
        </Button>
      ))}
    </div>
  )
}

function Social() {
  return (
    <div className="space-y-2">
      {SOCIAL_APPS.map((app) => (
        <Button key={app.provider} className={WIDE}>
          Continue with {app.name}
        </Button>
      ))}
    </div>
  )
}

function EmailField({ value }: { value?: string }) {
  return <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="username" defaultValue={value} required className="h-10" />}</Field>
}

function SignInForm({ action = 'Sign in', email }: { action?: string; email?: string }) {
  return (
    <form className="space-y-4" onSubmit={useSubmit('mfa')}>
      <EmailField value={email} />
      <Field label="Password">{(id) => <PasswordInput id={id} autoComplete="current-password" />}</Field>
      <Submit>{action}</Submit>
    </form>
  )
}

function SignUpForm({ action = 'Create account', email }: { action?: string; email?: string }) {
  return (
    <form className="space-y-4" onSubmit={useSubmit('profile')}>
      <EmailField value={email} />
      <Field label="Password" aside="8 or more characters">
        {(id) => <PasswordInput id={id} autoComplete="new-password" />}
      </Field>
      <Submit>{action}</Submit>
    </form>
  )
}

function InviteMeta() {
  return (
    <p className="mono mt-2 text-muted-foreground">
      {INVITE.orgUser.email} · {INVITE.orgUser.roleName}
    </p>
  )
}

function BackToSignIn() {
  const go = useGo()
  return (
    <Button className={TOUCH} onClick={() => go('sign-in')}>
      Back to sign in
    </Button>
  )
}

// The screens whose content is the same in every variant; only the frame around them changes.
function useCommon(screen: ScreenKey): Content | undefined {
  const sendReset = useSubmit('reset-sent')
  const setPassword = useSubmit('sign-in')
  const finish = useSubmit('profile')
  switch (screen) {
    case 'sign-up-closed':
      return {
        title: 'Sign-up is closed',
        body: (
          <div className="space-y-4">
            <p className="prose-text text-muted-foreground">Ask an administrator to invite you.</p>
            <BackToSignIn />
          </div>
        ),
      }
    case 'provider-signup':
      return {
        title: 'Finish creating your account',
        body: (
          <form className="space-y-4" onSubmit={finish}>
            <EmailField />
            <Submit>Create account</Submit>
          </form>
        ),
        links: [{ label: 'Use another account', to: 'sign-in' }],
      }
    case 'reset':
      return {
        title: 'Reset password',
        body: (
          <form className="space-y-4" onSubmit={sendReset}>
            <EmailField />
            <Submit>Send reset link</Submit>
          </form>
        ),
        links: [{ label: 'Back to sign in', to: 'sign-in' }],
      }
    case 'reset-sent':
      return {
        title: 'Check your email',
        body: (
          <div className="space-y-4">
            <p className="prose-text text-muted-foreground">
              If <span className="mono text-foreground">{INVITE.orgUser.email}</span> has an account, a reset link is on its way.
            </p>
            <BackToSignIn />
          </div>
        ),
      }
    case 'reset-no-email':
      return { title: 'Ask an administrator to reset your password', body: <BackToSignIn /> }
    case 'new-password':
      return {
        title: 'Set a new password',
        body: (
          <form className="space-y-4" onSubmit={setPassword}>
            <Field label="New password" aside="8 or more characters">
              {(id) => <PasswordInput id={id} autoComplete="new-password" />}
            </Field>
            <Submit>Set password</Submit>
          </form>
        ),
      }
    case 'invite-signed-in':
      return {
        title: `Join ${org}`,
        body: (
          <form className="space-y-4" onSubmit={finish}>
            <p className="prose-text text-muted-foreground">
              Signed in as <span className="mono text-foreground">{USER.email}</span>
            </p>
            <Submit>Join {org}</Submit>
          </form>
        ),
        links: [{ label: 'Use another account', to: 'sign-in' }],
      }
  }
}

function CodeField({ label }: { label: string }) {
  return (
    <Field label={label}>
      {(id) => <Input id={id} inputMode="numeric" autoComplete="one-time-code" required autoFocus className="h-10 font-mono tracking-[0.2em]" />}
    </Field>
  )
}

/* ---------- A: the /login page, repeated ---------- */

function FrameA({ title, body, links }: Content) {
  return (
    <main className="min-h-dvh pb-16">
      <div className="flex items-start pt-[14vh]" aria-hidden>
        <div className="mt-[10px] h-px flex-1 bg-border" />
        <Mark className="-mx-[3px] size-8" />
        <div className="mt-[21px] h-px flex-1 bg-border" />
      </div>
      <div className="mx-auto w-full max-w-[376px] px-4 pt-7">
        <p className="text-center font-mono text-xs font-semibold tracking-[0.18em]">FAULTLINE</p>
        <h1 className="mt-10 text-2xl font-semibold">{title}</h1>
        <div className="mt-5">{body}</div>
        <Links links={links} />
      </div>
    </main>
  )
}

function contentA(screen: ScreenKey, go: (screen: ScreenKey) => void, finish: (event: FormEvent) => void): Content {
  const social = (
    <div className="mt-6 border-t pt-6">
      <Social />
    </div>
  )
  switch (screen) {
    case 'sign-up':
      return { title: 'Create account', body: [<SignUpForm key="form" />, <div key="social">{social}</div>], links: [{ label: 'Sign in instead', to: 'sign-in' }] }
    case 'invite':
      return {
        title: `Join ${org}`,
        body: (
          <div className="-mt-3 space-y-5">
            <InviteMeta />
            <div className="space-y-2">
              <Button variant="default" className={WIDE} onClick={() => go('sign-up')}>
                Create account
              </Button>
              <Button className={WIDE} onClick={() => go('sign-in')}>
                Sign in
              </Button>
            </div>
          </div>
        ),
      }
    case 'mfa':
      return {
        title: 'Two-step verification',
        body: (
          <>
            <form className="space-y-4" onSubmit={finish}>
              <CodeField label="Authenticator or recovery code" />
              <Submit>Verify</Submit>
            </form>
            <div className="mt-6 border-t pt-6">
              <Button className={WIDE} onClick={() => go('profile')}>
                <KeyRound />
                Use a security key
              </Button>
            </div>
          </>
        ),
        links: [{ label: 'Use another account', to: 'sign-in' }],
      }
    default:
      return {
        title: 'Sign in',
        body: [<SignInForm key="form" />, <div key="social">{social}</div>],
        links: [
          { label: 'Forgot password?', to: 'reset' },
          { label: 'Create account', to: 'sign-up' },
        ],
      }
  }
}

export function SignedOutA({ screen }: { screen: ScreenKey }) {
  const common = useCommon(screen)
  const go = useGo()
  const finish = useSubmit('profile')
  return <FrameA {...(common ?? contentA(screen, go, finish))} />
}

/* ---------- B: one box, tabs inside ---------- */

function Tabs<T extends string>({ label, value, tabs, onChange }: { label: string; value: T; tabs: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex border-b">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn('-mb-px h-11 flex-1 border-b-2 px-2 text-sm font-medium', tab.value === value ? 'border-brand' : 'border-transparent text-muted-foreground hover:text-foreground')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

const ENTRY_TABS = [
  { value: 'sign-in', label: 'Sign in' },
  { value: 'sign-up', label: 'Create account' },
] as const

const METHODS = [
  { value: 'totp', label: 'Authenticator', icon: Smartphone, field: 'Code from your authenticator app' },
  { value: 'webauthn', label: 'Security key', icon: KeyRound, field: '' },
  { value: 'recovery_codes', label: 'Recovery code', icon: LifeBuoy, field: 'Recovery code' },
] as const
type Method = (typeof METHODS)[number]['value']

function MethodPanel({ method }: { method: Method }) {
  const finish = useSubmit('profile')
  const go = useGo()
  if (method === 'webauthn')
    return (
      <Button variant="default" className={WIDE} onClick={() => go('profile')}>
        <KeyRound />
        Use security key
      </Button>
    )
  return (
    <form className="space-y-4" onSubmit={finish}>
      <CodeField key={method} label={METHODS.find((m) => m.value === method)?.field ?? ''} />
      <Submit>Verify</Submit>
    </form>
  )
}

export function SignedOutB({ screen }: { screen: ScreenKey }) {
  const go = useGo()
  const common = useCommon(screen)
  const [joinTab, setJoinTab] = useState<'sign-up' | 'sign-in'>('sign-up')
  const [method, setMethod] = useState<Method>('totp')
  const entry = screen === 'sign-in' || screen === 'sign-up'
  let title = common?.title ?? ''
  let tabs: ReactNode = null
  let body = common?.body
  let links = common?.links
  if (entry) {
    title = screen === 'sign-in' ? 'Sign in' : 'Create account'
    tabs = <Tabs label="Account" value={screen} tabs={[...ENTRY_TABS]} onChange={go} />
    body = (
      <>
        {screen === 'sign-in' ? <SignInForm /> : <SignUpForm />}
        <div className="mt-5 border-t pt-5">
          <Social />
        </div>
      </>
    )
    links = screen === 'sign-in' ? [{ label: 'Forgot password?', to: 'reset' }] : undefined
  } else if (screen === 'invite') {
    title = `Join ${org}`
    tabs = <Tabs label="Account" value={joinTab} tabs={[...ENTRY_TABS].reverse()} onChange={setJoinTab} />
    body = joinTab === 'sign-up' ? <SignUpForm action="Create account and join" email={INVITE.orgUser.email} /> : <SignInForm action="Sign in and join" email={INVITE.orgUser.email} />
  } else if (screen === 'mfa') {
    title = 'Two-step verification'
    tabs = <Tabs label="Method" value={method} tabs={METHODS.map(({ value, label }) => ({ value, label }))} onChange={setMethod} />
    body = <MethodPanel method={method} />
    links = [{ label: 'Use another account', to: 'sign-in' }]
  }
  const headed = !entry
  return (
    <main className="grid min-h-dvh place-items-start justify-items-center px-3 pt-[12vh] pb-16 max-sm:pt-6">
      <div className="w-full max-w-[420px]">
        <div className="border bg-card">
          <div className="flex h-11 items-center border-b px-5">
            <Wordmark />
          </div>
          {headed ? (
            <div className="px-5 pt-5 pb-4">
              <h1 className="text-xl font-semibold">{title}</h1>
              {screen === 'invite' && <InviteMeta />}
            </div>
          ) : (
            <h1 className="sr-only">{title}</h1>
          )}
          {tabs && <div className={cn(headed && 'border-t')}>{tabs}</div>}
          <div className={cn('px-5 pb-5', tabs ? 'pt-5' : 'pt-0')}>{body}</div>
        </div>
        <div className="px-5">
          <Links links={links} />
        </div>
      </div>
    </main>
  )
}

/* ---------- C: the app's bar, a plain column, choices as rows ---------- */

function Or() {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden>
      <div className="h-px flex-1 bg-border" />
      <span className="label-caps">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function MethodRows() {
  const [open, setOpen] = useState<Method>('totp')
  return (
    <ul className="border-t">
      {METHODS.map((method) => (
        <li key={method.value} className="border-b">
          <button type="button" aria-expanded={open === method.value} onClick={() => setOpen(method.value)} className="flex h-12 w-full items-center gap-3 text-left font-medium hover:bg-accent">
            <method.icon className="size-4" />
            {method.label === 'Authenticator' ? 'Authenticator app' : method.label}
            <ChevronDown className={cn('ml-auto size-4 text-muted-foreground transition-transform duration-150', open === method.value && 'rotate-180')} />
          </button>
          {open === method.value && (
            <div className="pt-1 pb-5">
              <MethodPanel method={method.value} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function SignedOutC({ screen }: { screen: ScreenKey }) {
  const go = useGo()
  const common = useCommon(screen)
  const [joining, setJoining] = useState<'sign-up' | 'sign-in'>('sign-up')
  let content: Content
  if (common) content = common
  else if (screen === 'sign-up')
    content = {
      title: 'Create account',
      body: (
        <>
          <Social />
          <Or />
          <SignUpForm />
        </>
      ),
    }
  else if (screen === 'invite')
    content = {
      title: `Join ${org}`,
      body: (
        <>
          <div className="mb-5 flex items-center gap-3 border bg-card px-3 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center bg-foreground font-semibold text-background">{org[0]}</span>
            <span className="min-w-0">
              <span className="block font-medium">{org}</span>
              <span className="mono block truncate text-muted-foreground">
                {INVITE.orgUser.email} · {INVITE.orgUser.roleName}
              </span>
            </span>
          </div>
          {joining === 'sign-up' ? <SignUpForm action="Create account and join" email={INVITE.orgUser.email} /> : <SignInForm action="Sign in and join" email={INVITE.orgUser.email} />}
          <Or />
          <Social />
          <div className="mt-6">
            <Button variant="link" className="max-lg:min-h-11" onClick={() => setJoining(joining === 'sign-up' ? 'sign-in' : 'sign-up')}>
              {joining === 'sign-up' ? 'I already have an account' : 'Create an account instead'}
            </Button>
          </div>
        </>
      ),
    }
  else if (screen === 'mfa') content = { title: 'Two-step verification', body: <MethodRows />, links: [{ label: 'Use another account', to: 'sign-in' }] }
  else
    content = {
      title: 'Sign in',
      body: (
        <>
          <Social />
          <Or />
          <SignInForm />
        </>
      ),
      links: [{ label: 'Forgot password?', to: 'reset' }],
    }
  const other: LinkTo = screen === 'sign-in' ? { label: 'Create account', to: 'sign-up' } : { label: 'Sign in', to: 'sign-in' }
  return (
    <div className="min-h-dvh">
      <header className="flex h-11 items-center justify-between border-b px-3 md:px-4">
        <Wordmark />
        {screen !== 'invite' && screen !== 'mfa' && (
          <Button variant="link" className="max-lg:min-h-11" onClick={() => go(other.to)}>
            {other.label}
          </Button>
        )}
      </header>
      <main className="mx-auto w-full max-w-[400px] px-3 pt-16 pb-16 max-sm:pt-8 md:px-4">
        <h1 className="text-2xl font-semibold">{content.title}</h1>
        <div className="mt-5">{content.body}</div>
        <Links links={content.links} />
      </main>
    </div>
  )
}
