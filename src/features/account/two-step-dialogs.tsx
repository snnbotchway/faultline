import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { account, accountKeys, recoveryPreviewQuery, totpSetupQuery, twoStep, type SecurityKey } from '@/api/account'
import { explain } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Field, FormAlert } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { createSecurityKey, supportsSecurityKeys } from '@/lib/webauthn'
import { CopyButton } from './copy-button'
import { day } from './format'
import { QrCode } from './qr'
import { RowButton } from './rows'
import { useAction } from './use-action'

const CODE_INPUT = 'h-10 font-mono tracking-[0.2em] sm:max-w-48'

/* ---------- Authenticator app ---------- */

function Scan({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const setup = useQuery(totpSetupQuery)
  const [code, setCode] = useState('')
  const activate = useAction(() => twoStep.activateTotp(code.trim()), {
    action: 'check that code',
    refresh: [accountKeys.authenticators],
    onDone,
  })
  if (setup.isError)
    return (
      <>
        <FormAlert className="mb-4">{explain(setup.error, 'start setting up the authenticator app')}</FormAlert>
        <TaskActions>
          <Button onClick={onClose}>Close</Button>
        </TaskActions>
      </>
    )
  return (
    <form noValidate className="space-y-4" onSubmit={(event) => void activate.submit(event)}>
      {setup.data ? <QrCode value={setup.data.totp_url} label="QR code for your authenticator app" /> : <Skeleton className="size-44" />}
      <div>
        <p className="label-caps mb-2">Or type this key</p>
        <div className="flex items-center gap-2">
          {setup.data ? (
            <code className="mono min-w-0 flex-1 [overflow-wrap:anywhere]">{setup.data.secret.match(/.{1,4}/g)?.join(' ')}</code>
          ) : (
            <Skeleton className="h-5 flex-1" />
          )}
          {setup.data && <CopyButton text={setup.data.secret} />}
        </div>
      </div>
      <FormAlert>{activate.error}</FormAlert>
      <Field label="Code from your authenticator app" error={activate.fields.code}>
        {(field) => (
          <Input
            {...field}
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            className={CODE_INPUT}
          />
        )}
      </Field>
      <TaskActions>
        <Button type="submit" variant="default" disabled={activate.busy || !setup.data} aria-busy={activate.busy}>
          Continue
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </TaskActions>
    </form>
  )
}

/* ---------- Recovery codes ---------- */

// New codes are shown once and only start working when one of them is typed back, which proves they were saved.
function RecoveryCodesForm({ action, later, onDone, onClose }: { action: string; later: string; onDone: () => void; onClose: () => void }) {
  const preview = useQuery(recoveryPreviewQuery)
  const [code, setCode] = useState('')
  const confirm = useAction(() => twoStep.confirmRecoveryCodes(code.trim()), {
    action: 'save those codes',
    refresh: [accountKeys.authenticators],
    onDone,
  })
  const codes = preview.data ?? []
  const text = codes.join('\n')

  function submit(event: FormEvent<HTMLFormElement>) {
    // The backend only says "invalid"; say which codes are meant.
    void confirm.submit(event, undefined, { fields: code.trim() && !codes.includes(code.trim()) ? { code: 'Type one of the codes above.' } : {} })
  }

  if (preview.isError)
    return (
      <>
        <FormAlert className="mb-4">{explain(preview.error, 'make new recovery codes')}</FormAlert>
        <TaskActions>
          <Button onClick={onClose}>Close</Button>
        </TaskActions>
      </>
    )
  return (
    <form noValidate className="space-y-4" onSubmit={submit}>
      <div>
        <p className="label-caps mb-2">Recovery codes</p>
        {preview.data ? (
          <ul className="mono grid grid-cols-2 gap-x-8 gap-y-2 border bg-code px-4 py-3 tracking-[0.12em]">
            {codes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <Skeleton className="h-36" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={text} label="Copy codes" />
        <Button asChild className="max-lg:h-11">
          <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download="faultline-recovery-codes.txt">
            <Download />
            Download
          </a>
        </Button>
      </div>
      <FormAlert>{confirm.error}</FormAlert>
      <Field label="Type one of the codes to confirm you saved them" error={confirm.fields.code}>
        {(field) => (
          <Input
            {...field}
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            required
            className={CODE_INPUT}
          />
        )}
      </Field>
      <TaskActions>
        <Button type="submit" variant="default" disabled={confirm.busy || !preview.data} aria-busy={confirm.busy}>
          {action}
        </Button>
        <Button onClick={onClose}>{later}</Button>
      </TaskActions>
    </form>
  )
}

const TotpStep = { scan: 'scan', codes: 'codes' } as const
type TotpStep = (typeof TotpStep)[keyof typeof TotpStep]

function TotpSteps({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<TotpStep>(TotpStep.scan)
  return (
    <TaskDialog open onClose={onClose} title="Turn on two-step verification" step={step === TotpStep.scan ? 'Step 1 of 2' : 'Step 2 of 2'}>
      {step === TotpStep.scan ? (
        <Scan onDone={() => setStep(TotpStep.codes)} onClose={onClose} />
      ) : (
        // The app is already on by now, so leaving here keeps it on; the codes can be made again from the profile.
        <RecoveryCodesForm action="Confirm codes" later="Later" onDone={onClose} onClose={onClose} />
      )}
    </TaskDialog>
  )
}

export function TotpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Mounted per opening, so every attempt starts at the first step with a new secret.
  return open ? <TotpSteps onClose={onClose} /> : null
}

export function RecoveryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <TaskDialog open={open} onClose={onClose} title="New recovery codes">
      <RecoveryCodesForm action="Replace old codes" later="Cancel" onDone={onClose} onClose={onClose} />
    </TaskDialog>
  )
}

/* ---------- Security keys ---------- */

function KeyRow({ item }: { item: SecurityKey }) {
  const [confirming, setConfirming] = useState(false)
  const remove = useAction(() => twoStep.removeSecurityKey(item.id), {
    action: 'remove that key',
    refresh: [accountKeys.authenticators],
  })
  return (
    <li className="border-b py-2">
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{item.name}</span>
        <span className="mono text-muted-foreground">
          added {day(item.created_at)}
          {item.last_used_at ? ` · used ${day(item.last_used_at)}` : ''}
        </span>
        <span className="ml-auto flex items-center gap-x-4">
          {confirming ? (
            <>
              <RowButton className="text-destructive" disabled={remove.busy} onClick={() => void remove.run()}>
                Remove it
              </RowButton>
              <RowButton onClick={() => setConfirming(false)}>Keep</RowButton>
            </>
          ) : (
            <RowButton onClick={() => setConfirming(true)}>Remove</RowButton>
          )}
        </span>
      </div>
      {remove.error && (
        <p className="prose-text pb-1 text-destructive" role="alert">
          {remove.error}
        </p>
      )}
    </li>
  )
}

// What the browser says when the key in hand is already registered to this account.
const ALREADY_ADDED = 'InvalidStateError'

function AddKey() {
  const [name, setName] = useState('')
  const [failure, setFailure] = useState('')
  const add = useAction(
    async () => {
      setFailure('')
      const options = await twoStep.securityKeyOptions()
      let credential: unknown
      try {
        credential = await createSecurityKey(options)
      } catch (error) {
        // The browser's prompt was dismissed, timed out, or refused the key. Its own wording is for developers.
        setFailure(
          error instanceof DOMException && error.name === ALREADY_ADDED
            ? 'That key is already added.'
            : "The key wasn't added. Try again, and touch the key when your browser asks.",
        )
        return
      }
      await twoStep.addSecurityKey(name.trim(), credential)
      setName('')
    },
    { action: 'add that key', refresh: [accountKeys.authenticators] },
  )
  return (
    <form noValidate className="space-y-4" onSubmit={(event) => void add.submit(event)}>
      <FormAlert>{failure || add.error}</FormAlert>
      <Field label="Name for a new key" error={add.fields.name}>
        {(field) => <Input {...field} name="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="h-10" autoComplete="off" />}
      </Field>
      <TaskActions>
        <Button type="submit" variant="default" disabled={add.busy} aria-busy={add.busy}>
          {add.busy ? 'Waiting for your security key' : 'Add security key'}
        </Button>
      </TaskActions>
    </form>
  )
}

// The one place security keys are listed, removed and added.
export function KeysDialog({ open, onClose, keys }: { open: boolean; onClose: () => void; keys: SecurityKey[] }) {
  return (
    <TaskDialog open={open} onClose={onClose} title="Security keys" done quietFocus={keys.length > 0}>
      {keys.length > 0 && (
        <ul className="mb-5 border-t">
          {keys.map((item) => (
            <KeyRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      {supportsSecurityKeys() ? (
        <AddKey />
      ) : (
        <p className="prose-text text-muted-foreground">This browser can't add a security key. Use a current browser to add one.</p>
      )}
    </TaskDialog>
  )
}

/* ---------- Before any of it: every email verified ---------- */

// The backend refuses two-step verification while any address on the account is unverified.
export function VerifyFirstDialog({ open, onClose, emails, canSend }: { open: boolean; onClose: () => void; emails: string[]; canSend: boolean }) {
  const [sent, setSent] = useState(false)
  const send = useAction(() => Promise.all(emails.map((email) => account.sendVerification(email))), {
    action: emails.length === 1 ? 'send the link' : 'send the links',
    onDone: () => setSent(true),
  })
  const one = emails.length === 1
  const addresses = <span className="mono [overflow-wrap:anywhere] text-foreground">{emails.join(', ')}</span>
  return (
    <TaskDialog
      open={open}
      onClose={onClose}
      title={one ? 'Verify your email first' : 'Verify your emails first'}
      quietFocus
      description={
        !canSend ? (
          <>
            Two-step verification stays off while {addresses} {one ? 'is' : 'are'} not verified, and this server can't send email. Ask an administrator to
            verify {one ? 'it' : 'them'}, or remove {one ? 'it' : 'them'} under Emails.
          </>
        ) : sent ? (
          <>
            Open the {one ? 'link' : 'links'} sent to {addresses}, then turn this on.
          </>
        ) : (
          <>
            Two-step verification stays off while {addresses} {one ? 'is' : 'are'} not verified. Send {one ? 'a link to verify it' : 'links to verify them'}, or
            remove {one ? 'it' : 'them'} under Emails.
          </>
        )
      }
    >
      <FormAlert className="mb-4">{send.error}</FormAlert>
      <TaskActions>
        {canSend && !sent && (
          <Button variant="default" disabled={send.busy} aria-busy={send.busy} onClick={() => void send.run()}>
            {one ? 'Send link' : 'Send links'}
          </Button>
        )}
        <Button onClick={onClose}>{sent || !canSend ? 'Close' : 'Cancel'}</Button>
      </TaskActions>
    </TaskDialog>
  )
}
