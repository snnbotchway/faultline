import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { account, accountKeys, recoveryPreviewQuery, totpSetupQuery, twoStep, type SecurityKey } from '@/api/account'
import { explain } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { CODE_INPUT, Field, FieldError, FormAlert, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { useT } from '@/i18n'
import { createSecurityKey, supportsSecurityKeys } from '@/lib/webauthn'
import { CopyButton } from './copy-button'
import { day } from './format'
import { QrCode } from './qr'
import { RowButton } from '@/components/ui/row-button'
import { cn } from '@/lib/utils'
import { useAction } from './use-action'


/* ---------- Authenticator app ---------- */

function Scan({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const setup = useQuery(totpSetupQuery)
  const [code, setCode] = useState('')
  const { account: { twoStep: text }, common } = useT()
  const activate = useAction(() => twoStep.activateTotp(code.trim()), {
    action: text.checkAction,
    refresh: [accountKeys.authenticators],
    onDone,
  })
  if (setup.isError)
    return (
      <>
        <FormAlert className="mb-4">{explain(setup.error, text.startAction)}</FormAlert>
        <TaskActions>
          <Button onClick={onClose}>{common.close}</Button>
        </TaskActions>
      </>
    )
  return (
    <form noValidate className="space-y-4" onSubmit={(event) => void activate.submit(event)}>
      {setup.data ? <QrCode value={setup.data.totp_url} label={text.qr} /> : <Skeleton className="size-44" />}
      <div>
        <p className="label-caps mb-2">{text.typeKey}</p>
        <div className="flex items-center gap-2">
          {setup.data ? (
            <code className="mono min-w-0 flex-1 [overflow-wrap:anywhere]">{setup.data.secret.match(/.{1,4}/g)?.join(' ')}</code>
          ) : (
            <Skeleton className="h-5 flex-1" />
          )}
          {setup.data && <CopyButton text={setup.data.secret} />}
        </div>
      </div>
      <FormAlert>{activate.message}</FormAlert>
      <Field label={text.appCode} error={activate.fields.code}>
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
            className={cn(CODE_INPUT, 'sm:max-w-48')}
          />
        )}
      </Field>
      <TaskActions>
        <SubmitButton busy={activate.busy} disabled={!setup.data}>
          {text.continue}
        </SubmitButton>
        <Button onClick={onClose}>{common.cancel}</Button>
      </TaskActions>
    </form>
  )
}

/* ---------- Recovery codes ---------- */

// New codes are shown once and only start working when one of them is typed back, which proves they were saved.
// `cancel` names the way out; without one the codes must be confirmed.
function RecoveryCodesForm({ action, cancel, onDone, onClose }: { action: string; cancel?: string; onDone: () => void; onClose: () => void }) {
  const preview = useQuery(recoveryPreviewQuery)
  const [code, setCode] = useState('')
  const { account: { twoStep: text }, common } = useT()
  const confirm = useAction(() => twoStep.confirmRecoveryCodes(code.trim()), {
    action: text.saveCodesAction,
    refresh: [accountKeys.authenticators],
    onDone,
  })
  const codes = preview.data ?? []
  const codesText = codes.join('\n')

  function submit(event: FormEvent<HTMLFormElement>) {
    // The backend only says "invalid"; say which codes are meant.
    void confirm.submit(event, undefined, { fields: code.trim() && !codes.includes(code.trim()) ? { code: text.typeOne } : {} })
  }

  if (preview.isError)
    return (
      <>
        <FormAlert className="mb-4">{explain(preview.error, text.newCodesAction)}</FormAlert>
        <TaskActions>
          <Button onClick={onClose}>{common.close}</Button>
        </TaskActions>
      </>
    )
  return (
    <form noValidate className="space-y-4" onSubmit={submit}>
      {preview.data ? (
        <ul aria-label={text.recoveryCodes} className="mono grid grid-cols-2 gap-x-8 gap-y-2 border bg-code px-4 py-3 tracking-code">
          {codes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <Skeleton className="h-36" />
      )}
      <div className="flex flex-wrap gap-2">
        <CopyButton text={codesText} label={text.copyCodes} />
        <Button asChild className="max-lg:h-11">
          <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(codesText)}`} download="faultline-recovery-codes.txt">
            <Download />
            {text.download}
          </a>
        </Button>
      </div>
      <FormAlert>{confirm.message}</FormAlert>
      <Field label={text.confirmSaved} error={confirm.fields.code}>
        {(field) => (
          <Input
            {...field}
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            required
            className={cn(CODE_INPUT, 'sm:max-w-48')}
          />
        )}
      </Field>
      <TaskActions>
        <SubmitButton busy={confirm.busy} disabled={!preview.data}>
          {action}
        </SubmitButton>
        {cancel && <Button onClick={onClose}>{cancel}</Button>}
      </TaskActions>
    </form>
  )
}

const TotpStep = { scan: 'scan', codes: 'codes' } as const
type TotpStep = (typeof TotpStep)[keyof typeof TotpStep]

function TotpSteps({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<TotpStep>(TotpStep.scan)
  const text = useT().account.twoStep
  return (
    // Once the app is on, the backend has also made recovery codes nobody has seen, so the new ones must be confirmed.
    <TaskDialog open onClose={onClose} title={text.turnOnTitle} step={text.step(step === TotpStep.scan ? 1 : 2, 2)} modal={step === TotpStep.codes}>
      {step === TotpStep.scan ? (
        <Scan onDone={() => setStep(TotpStep.codes)} onClose={onClose} />
      ) : (
        <RecoveryCodesForm action={text.confirmCodes} onDone={onClose} onClose={onClose} />
      )}
    </TaskDialog>
  )
}

export function TotpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Mounted per opening, so every attempt starts at the first step with a new secret.
  return open ? <TotpSteps onClose={onClose} /> : null
}

export function RecoveryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { account: { twoStep: text }, common } = useT()
  return (
    <TaskDialog open={open} onClose={onClose} title={text.newCodesTitle}>
      <RecoveryCodesForm action={text.replaceCodes} cancel={common.cancel} onDone={onClose} onClose={onClose} />
    </TaskDialog>
  )
}

/* ---------- Security keys ---------- */

function KeyRow({ item }: { item: SecurityKey }) {
  const [confirming, setConfirming] = useState(false)
  const { account: { twoStep: text }, common } = useT()
  const remove = useAction(() => twoStep.removeSecurityKey(item.id), {
    action: text.removeKeyAction,
    refresh: [accountKeys.authenticators],
  })
  return (
    <li className="border-b py-2">
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{item.name}</span>
        <span className="mono text-muted-foreground">
          {text.added(day(item.created_at))}
          {item.last_used_at ? text.used(day(item.last_used_at)) : ''}
        </span>
        <span className="ml-auto flex items-center gap-x-4">
          {confirming ? (
            <>
              <RowButton danger disabled={remove.busy} onClick={() => void remove.run()}>
                {common.removeIt}
              </RowButton>
              <RowButton onClick={() => setConfirming(false)}>{common.keep}</RowButton>
            </>
          ) : (
            <RowButton danger onClick={() => setConfirming(true)}>
              {common.remove}
            </RowButton>
          )}
        </span>
      </div>
      <FieldError className="pb-1">{remove.message}</FieldError>
    </li>
  )
}

// What the browser says when the key in hand is already registered to this account.
const ALREADY_ADDED = 'InvalidStateError'

function AddKey() {
  const [name, setName] = useState('')
  const [failure, setFailure] = useState('')
  const text = useT().account.twoStep
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
          error instanceof DOMException && error.name === ALREADY_ADDED ? text.keyAlreadyAdded : text.keyNotAdded,
        )
        return
      }
      await twoStep.addSecurityKey(name.trim(), credential)
      setName('')
    },
    { action: text.addKeyAction, refresh: [accountKeys.authenticators] },
  )
  return (
    <form noValidate className="space-y-4" onSubmit={(event) => void add.submit(event)}>
      <FormAlert>{failure || add.message}</FormAlert>
      <Field label={text.keyName} error={add.fields.name}>
        {(field) => <Input {...field} name="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="h-10" autoComplete="off" />}
      </Field>
      <TaskActions>
        <SubmitButton busy={add.busy}>
          {add.busy ? text.waitingForKey : text.addKey}
        </SubmitButton>
      </TaskActions>
    </form>
  )
}

// The one place security keys are listed, removed and added.
export function KeysDialog({ open, onClose, keys }: { open: boolean; onClose: () => void; keys: SecurityKey[] }) {
  const text = useT().account.twoStep
  return (
    <TaskDialog open={open} onClose={onClose} title={text.keysTitle} done quietFocus={keys.length > 0}>
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
        <p className="prose-text text-muted-foreground">{text.noKeys}</p>
      )}
    </TaskDialog>
  )
}

/* ---------- Before any of it: every email verified ---------- */

// The backend refuses two-step verification while any address on the account is unverified.
export function VerifyFirstDialog({ open, onClose, emails, canSend }: { open: boolean; onClose: () => void; emails: string[]; canSend: boolean }) {
  const [sent, setSent] = useState(false)
  const { account: { twoStep: text }, common } = useT()
  const send = useAction(() => Promise.all(emails.map((email) => account.sendVerification(email))), {
    action: text.sendLinkAction(emails.length),
    onDone: () => setSent(true),
  })
  const count = emails.length
  const addresses = <span className="mono [overflow-wrap:anywhere] text-foreground">{emails.join(', ')}</span>
  return (
    <TaskDialog
      open={open}
      onClose={onClose}
      title={text.verifyFirst(count)}
      quietFocus
      description={!canSend ? text.cantSend(addresses, count) : sent ? text.openLinks(addresses, count) : text.sendFirst(addresses, count)}
    >
      <FormAlert className="mb-4">{send.message}</FormAlert>
      <TaskActions>
        {canSend && !sent && (
          <Button variant="default" disabled={send.busy} aria-busy={send.busy} onClick={() => void send.run()}>
            {text.sendLinks(count)}
          </Button>
        )}
        <Button onClick={onClose}>{sent || !canSend ? common.close : common.cancel}</Button>
      </TaskActions>
    </TaskDialog>
  )
}
