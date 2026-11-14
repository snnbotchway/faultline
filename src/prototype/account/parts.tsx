// PROTOTYPE, throwaway. The leaf pieces every variant shares: fields, the steps of a short task, list rows.
// Layout (where a step appears, how sections are grouped) belongs to the variants, not here.
import { Check, ChevronsUpDown, Copy, Download, Ellipsis, Monitor, Moon, Search, Sun } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Wordmark } from '@/components/mark'
import { SECTIONS as APP_SECTIONS, TAB_PATHS } from '@/components/shell/sections'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Theme, setTheme, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { TOUCH, day, type Account } from './model'
import { PROJECTS, RECOVERY_PREVIEW, RELEASES_SCOPE, SCOPE_LEVELS, SCOPE_RESOURCES, TOTP_SECRET, type AlertChoice, type ApiToken } from './stub'


export function Field({ label, aside, error, children }: { label: string; aside?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children(id)}
      {error && (
        <p className="prose-text mt-1.5 text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordInput({ id, autoComplete }: { id: string; autoComplete: string }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={shown ? 'text' : 'password'} autoComplete={autoComplete} required className="h-10 pr-14" />
      <button type="button" className="absolute inset-y-0 right-0 px-3 text-sm text-muted-foreground hover:text-foreground" onClick={() => setShown(!shown)}>
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy', variant = 'outline', className }: { text: string; label?: string; variant?: 'outline' | 'default'; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant={variant}
      className={cn(TOUCH, className)}
      onClick={() => {
        void navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

export function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 border">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 border-l px-3 text-sm first:border-l-0 max-lg:h-11',
            option.value === value ? 'bg-selected font-semibold' : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Tag({ children, tone }: { children: ReactNode; tone?: 'warning' | 'ok' }) {
  return (
    <span className={cn('border px-1.5 py-px text-xs', tone === 'warning' && 'border-level-warning text-level-warning', tone === 'ok' && 'border-ok text-ok')}>
      {children}
    </span>
  )
}

export function Confirm({ title, action, onConfirm, children }: { title: string; action: string; onConfirm: () => void; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-5" aria-describedby={undefined}>
        <DialogTitle>{title}</DialogTitle>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button className={TOUCH}>Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" className={TOUCH} onClick={onConfirm}>
              {action}
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Stand-in for the real code: the build will draw it from the otpauth URL the backend returns.
const QR_SIZE = 29
const QR_CELLS = (() => {
  let seed = 7
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  const finder = (x: number, y: number) => {
    for (const [fx, fy] of [[0, 0], [QR_SIZE - 7, 0], [0, QR_SIZE - 7]] as const) {
      const dx = x - fx
      const dy = y - fy
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
        const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3))
        return ring !== 2 && ring <= 3
      }
    }
    return undefined
  }
  const cells: [number, number][] = []
  for (let y = 0; y < QR_SIZE; y++) for (let x = 0; x < QR_SIZE; x++) if (finder(x, y) ?? next() > 0.52) cells.push([x, y])
  return cells
})()

function FakeQr() {
  return (
    <svg viewBox={`0 0 ${QR_SIZE + 4} ${QR_SIZE + 4}`} className="size-44 shrink-0 border bg-white fill-black" shapeRendering="crispEdges" role="img" aria-label="QR code for your authenticator app">
      {QR_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 2} y={y + 2} width="1" height="1" />
      ))}
    </svg>
  )
}

function StepActions({ primary, onCancel }: { primary: string; onCancel: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" variant="default" className={cn('h-10', TOUCH)}>
        {primary}
      </Button>
      <Button className={cn('h-10', TOUCH)} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}

function CodeInput({ id, digits, invalid }: { id: string; digits: number; invalid?: boolean }) {
  return <Input id={id} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={digits} aria-invalid={invalid} className="h-10 max-w-48 font-mono tracking-[0.2em]" />
}

function useCodeForm(onDone: () => void, missing: string) {
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = new FormData(event.currentTarget).get('code')
    if (typeof code === 'string' && code.trim()) onDone()
    else setError(missing)
  }
  return { error, submit }
}

// Step 1 of turning on two-step verification: scan, then prove the app works.
export function TotpScan({ stack, onNext, onCancel }: { stack?: boolean; onNext: () => void; onCancel: () => void }) {
  const { error, submit } = useCodeForm(onNext, 'Enter the 6-digit code your app shows.')
  return (
    <form onSubmit={submit} className={cn('flex gap-x-6 gap-y-4', stack ? 'flex-col' : 'max-sm:flex-col')}>
      <FakeQr />
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <p className="label-caps mb-1.5">Or type this key</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="mono break-all">{TOTP_SECRET.match(/.{4}/g)?.join(' ')}</code>
            <CopyButton text={TOTP_SECRET} />
          </div>
        </div>
        <Field label="Code from your authenticator app" error={error}>
          {(id) => <CodeInput id={id} digits={6} invalid={!!error} />}
        </Field>
        <StepActions primary="Continue" onCancel={onCancel} />
      </div>
    </form>
  )
}

// Step 2, and also "new recovery codes": the codes only start working once one is typed back.
export function RecoveryStep({ action, onDone, onCancel }: { action: string; onDone: () => void; onCancel: () => void }) {
  const { error, submit } = useCodeForm(onDone, 'Type one of the codes above.')
  const text = RECOVERY_PREVIEW.join('\n')
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="label-caps mb-1.5">Recovery codes</p>
        <ul className="mono grid max-w-sm grid-cols-2 gap-x-8 gap-y-1.5 border bg-code px-4 py-3 tracking-[0.12em]">
          {RECOVERY_PREVIEW.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={text} label="Copy codes" />
        <Button asChild className={TOUCH}>
          <a href={`data:text/plain,${encodeURIComponent(text)}`} download="faultline-recovery-codes.txt">
            <Download />
            Download
          </a>
        </Button>
      </div>
      <Field label="Type one of the codes to confirm you saved them" error={error}>
        {(id) => <CodeInput id={id} digits={8} invalid={!!error} />}
      </Field>
      <StepActions primary={action} onCancel={onCancel} />
    </form>
  )
}

export function KeyForm({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        // The real screen hands over to the browser's security-key prompt here.
        onAdd(String(new FormData(event.currentTarget).get('name') || 'Security key'))
      }}
    >
      <Field label="Name for this key">
        {(id) => <Input id={id} name="name" className="h-10 max-w-sm" defaultValue="MacBook Touch ID" required />}
      </Field>
      <StepActions primary="Add security key" onCancel={onCancel} />
    </form>
  )
}

const THEMES = [
  { value: Theme.system, label: 'System', icon: Monitor },
  { value: Theme.light, label: 'Light', icon: Sun },
  { value: Theme.dark, label: 'Dark', icon: Moon },
]

export function ThemePicker() {
  return <Segmented label="Theme" value={useTheme()} options={THEMES} onChange={setTheme} />
}

const timeZones = Intl.supportedValuesOf('timeZone')

export function DetailsForm({ account, onSaved }: { account: Account; onSaved?: () => void }) {
  const [name, setName] = useState(account.name)
  const [timezone, setTimezone] = useState(account.timezone)
  const listId = useId()
  const dirty = name !== account.name || timezone !== account.timezone
  return (
    <form
      className="max-w-sm space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        account.setName(name)
        account.setTimezone(timezone)
        onSaved?.()
      }}
    >
      <Field label="Name">{(id) => <Input id={id} className="h-10" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />}</Field>
      <Field label="Time zone">
        {(id) => (
          <>
            <Input id={id} className="mono h-10" list={listId} value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            <datalist id={listId}>
              {timeZones.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Button type="submit" variant={dirty ? 'default' : 'outline'} className={cn('h-10', TOUCH)} disabled={!dirty}>
        Save
      </Button>
    </form>
  )
}

export function EmailList({ account }: { account: Account }) {
  return (
    <div>
      <ul className="border-t">
        {account.emails.map((address) => (
          <li key={address.email} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b py-1.5">
            <span className="mono min-w-0 break-all">{address.email}</span>
            {address.isPrimary && <Tag>Primary</Tag>}
            {!address.isVerified && <Tag tone="warning">Not verified</Tag>}
            {!address.isPrimary && (
              <span className="ml-auto flex flex-wrap gap-2">
                {address.isVerified ? (
                  <Button className={TOUCH} onClick={() => account.makePrimary(address.email)}>
                    Make primary
                  </Button>
                ) : (
                  account.emailEnabled && <Button className={TOUCH}>Send link again</Button>
                )}
                <Confirm title={`Remove ${address.email}?`} action="Remove email" onConfirm={() => account.removeEmail(address.email)}>
                  <Button className={TOUCH}>Remove</Button>
                </Confirm>
              </span>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex max-w-sm gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const email = String(new FormData(event.currentTarget).get('email'))
          if (email) account.addEmail(email)
          event.currentTarget.reset()
        }}
      >
        <Input name="email" type="email" aria-label="Another email" placeholder="another@example.com" autoComplete="email" required />
        <Button type="submit" className={cn('h-9', TOUCH)}>
          Add email
        </Button>
      </form>
    </div>
  )
}

export function PasswordForm({ account, onDone }: { account: Account; onDone?: () => void }) {
  const hasPassword = account.user.hasPasswordAuth
  return (
    <form
      className="max-w-sm space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.currentTarget.reset()
        onDone?.()
      }}
    >
      {hasPassword && <Field label="Current password">{(id) => <PasswordInput id={id} autoComplete="current-password" />}</Field>}
      <Field label="New password" aside="8 or more characters">
        {(id) => <PasswordInput id={id} autoComplete="new-password" />}
      </Field>
      <Button type="submit" className={cn('h-10', TOUCH)}>
        {hasPassword ? 'Change password' : 'Set password'}
      </Button>
    </form>
  )
}

export function LinkedList({ account }: { account: Account }) {
  const appName = (provider: string) => account.socialApps.find((app) => app.provider === provider)?.name ?? provider
  const unlinked = account.socialApps.filter((app) => !account.identities.some((identity) => identity.provider === app.provider))
  return (
    <div>
      {account.identities.length > 0 && (
        <ul className="mb-3 border-t">
          {account.identities.map((identity) => (
            <li key={identity.uid} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b py-1.5">
              <span className="font-medium">{appName(identity.provider)}</span>
              <span className="mono min-w-0 break-all text-muted-foreground">{identity.email ?? identity.username}</span>
              <Confirm title={`Disconnect ${appName(identity.provider)}?`} action="Disconnect" onConfirm={() => account.disconnect(identity.uid)}>
                <Button className={cn('ml-auto', TOUCH)}>Disconnect</Button>
              </Confirm>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {unlinked.map((app) => (
          <Button key={app.provider} className={TOUCH}>
            Connect {app.name}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function KeyRows({ account }: { account: Account }) {
  return (
    <ul className="border-t">
      {account.keys.map((key) => (
        <li key={key.id} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b py-1.5">
          <span className="font-medium">{key.name}</span>
          <span className="mono text-muted-foreground">
            added {day(key.created_at)}
            {key.last_used_at ? ` · used ${day(key.last_used_at)}` : ''}
          </span>
          <Confirm title={`Remove ${key.name}?`} action="Remove key" onConfirm={() => account.removeKey(key.id)}>
            <Button className={cn('ml-auto', TOUCH)}>Remove</Button>
          </Confirm>
        </li>
      ))}
    </ul>
  )
}

const ALERT_CHOICES: { value: AlertChoice; label: string }[] = [
  { value: -1, label: 'Default' },
  { value: 1, label: 'On' },
  { value: 0, label: 'Off' },
]

export function NotificationList({ account }: { account: Account }) {
  const orgs = [...new Set(PROJECTS.map((project) => project.org))]
  return (
    <div className="max-w-xl">
      <div className="flex min-h-11 items-center justify-between gap-3 border-y py-1.5">
        <span className="font-medium">Alert emails</span>
        <Segmented
          label="Alert emails"
          value={account.alertDefault ? 1 : 0}
          options={[
            { value: 1, label: 'On' },
            { value: 0, label: 'Off' },
          ]}
          onChange={(value) => account.setAlertDefault(value === 1)}
        />
      </div>
      {orgs.map((org) => (
        <div key={org}>
          <p className="label-caps mt-5 mb-1.5">{org}</p>
          <ul className="border-t">
            {PROJECTS.filter((project) => project.org === org).map((project) => (
              <li key={project.id} className="flex min-h-11 items-center justify-between gap-3 border-b py-1.5">
                <span className="mono min-w-0 truncate">{project.slug}</span>
                <Segmented label={`Alert emails for ${project.slug}`} value={account.alerts[project.id] ?? -1} options={ALERT_CHOICES} onChange={(choice) => account.setAlert(project.id, choice)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function TokenForm({ onCreate, onCancel }: { onCreate: (label: string, scopes: string[]) => void; onCancel: () => void }) {
  const [scopes, setScopes] = useState<string[]>(['project:read'])
  const [error, setError] = useState('')
  const toggle = (scope: string) => setScopes((list) => (list.includes(scope) ? list.filter((s) => s !== scope) : [...list, scope]))
  const box = (scope: string) => <Checkbox hit checked={scopes.includes(scope)} onCheckedChange={() => toggle(scope)} aria-label={scope} />
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (scopes.length === 0) return setError('Pick at least one thing this token may do.')
        onCreate(String(new FormData(event.currentTarget).get('label')), scopes)
      }}
    >
      <Field label="Label">{(id) => <Input id={id} name="label" className="h-10 max-w-sm" required autoFocus />}</Field>
      <div>
        <p className="mb-1.5 text-sm font-medium">This token may</p>
        <table className="w-full max-w-sm border-y">
          <thead>
            <tr className="border-b">
              <th />
              {SCOPE_LEVELS.map((level) => (
                <th key={level} className="label-caps w-16 py-1.5 text-center font-normal">
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCOPE_RESOURCES.map((resource) => (
              <tr key={resource.key} className="border-b">
                <th className="text-left font-normal">{resource.label}</th>
                {SCOPE_LEVELS.map((level) => (
                  <td key={level} className="text-center">
                    {box(`${resource.key}:${level}`)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="text-left font-normal">Releases</th>
              <td />
              <td className="text-center">{box(RELEASES_SCOPE)}</td>
              <td />
            </tr>
          </tbody>
        </table>
        {error && (
          <p className="prose-text mt-1.5 text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <StepActions primary="Create token" onCancel={onCancel} />
    </form>
  )
}

// Shown once, right after creating a token.
export function TokenReveal({ token, onDone }: { token: ApiToken; onDone: () => void }) {
  return (
    <div className="border bg-selected p-4">
      <p className="font-medium">
        Copy <span className="font-semibold">{token.label}</span> now. It won't be shown again.
      </p>
      <code className="mono mt-3 block overflow-x-auto border bg-code px-3 py-2.5 whitespace-nowrap">{token.token}</code>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={token.token} label="Copy token" variant="default" className="h-10" />
        <Button className={cn('h-10', TOUCH)} onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}

export function TokenRows({ account }: { account: Account }) {
  if (account.tokens.length === 0) return <p className="prose-text border-y py-3 text-muted-foreground">No tokens. Create one to use the API or the command-line tools.</p>
  return (
    <ul className="border-t">
      {account.tokens.map((token) => (
        <li key={token.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 border-b py-2">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            <span className="font-medium">{token.label}</span>
            <span className="mono text-muted-foreground">
              {token.token.slice(0, 6)}… · {day(token.created)}
            </span>
          </span>
          <Confirm title={`Revoke ${token.label}?`} action="Revoke token" onConfirm={() => account.revokeToken(token.id)}>
            <Button className={cn('row-span-2', TOUCH)}>Revoke</Button>
          </Confirm>
          <span className="mono min-w-0 text-muted-foreground">{token.scopes.join(' ')}</span>
        </li>
      ))}
    </ul>
  )
}

// A static copy of the signed-in shell, so the profile is judged inside the app's bars.
export function ProtoShell({ children }: { children: ReactNode }) {
  const tabs = APP_SECTIONS.filter((section) => TAB_PATHS.includes(section.path))
  return (
    <div className="flex min-h-dvh flex-col max-lg:pb-14">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b px-3 md:px-4">
        <Wordmark />
        <span className="mono flex h-7 items-center gap-1.5 px-1.5 text-muted-foreground">
          demo-co
          <ChevronsUpDown className="size-3" />
        </span>
        <nav className="ml-auto flex h-full items-stretch gap-4 max-lg:hidden" aria-label="Sections">
          {APP_SECTIONS.map((section) => (
            <span key={section.path} className="flex items-center text-sm font-medium text-muted-foreground">
              {section.label}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-1 max-lg:ml-auto lg:border-l lg:pl-3">
          <Button size="sm" className="gap-1.5 px-2 max-lg:size-9 max-lg:px-0" aria-label="Commands">
            <Search className="size-3.5 max-lg:size-4" />
            <Kbd className="border-0 px-0 opacity-100">⌘K</Kbd>
          </Button>
          <Button variant="ghost" size="icon-sm" className="max-lg:hidden" aria-label="Account" aria-current="page">
            <span className="grid size-5 place-items-center bg-brand text-xs font-semibold text-background uppercase">A</span>
          </Button>
        </div>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t bg-card lg:hidden" aria-label="Sections">
        {[...tabs, { path: 'more', label: 'More', icon: Ellipsis }].map((section) => (
          <span key={section.path} className={cn('flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent text-xs', section.path === 'more' ? 'border-brand font-semibold' : 'text-muted-foreground')}>
            <section.icon className="size-5" strokeWidth={1.6} />
            {section.label}
          </span>
        ))}
      </nav>
    </div>
  )
}
