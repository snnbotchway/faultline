import { KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MfaType, SessionStatus, auth, type Session } from '@/api/auth'
import { ApiError, HttpStatus } from '@/api/client'
import { Button } from '@/components/ui/button'
import { CODE_INPUT, FULL_BUTTON, Field, FormAlert, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { messages, useT } from '@/i18n'
import { askSecurityKey, supportsSecurityKeys } from '@/lib/webauthn'
import { AuthLinks } from './frame'
import { useSessionForm } from './session-form'

const KeyState = { idle: 'idle', waiting: 'waiting', failed: 'failed' } as const
type KeyState = (typeof KeyState)[keyof typeof KeyState]

const codeLabel = (types: MfaType[]) => {
  const text = messages().auth.twoStep
  const app = types.includes(MfaType.totp)
  const recovery = types.includes(MfaType.recoveryCodes)
  if (app && recovery) return text.appOrRecovery
  return app ? text.app : text.recovery
}

// The second step of signing in: a code from the authenticator app, a recovery code, or a security key.
// `onTimedOut` runs when the backend has dropped the half-finished sign-in, so it must start again.
export function TwoStepCheck({ types, onTimedOut }: { types: MfaType[]; onTimedOut: () => void }) {
  const { auth: t, common } = useT()
  const form = useSessionForm(t.twoStep.checkAction)
  const [code, setCode] = useState('')
  const [key, setKey] = useState<KeyState>(KeyState.idle)
  const waiting = useRef<AbortController | null>(null)
  const takesCode = types.includes(MfaType.totp) || types.includes(MfaType.recoveryCodes)
  const takesKey = types.includes(MfaType.webauthn) && supportsSecurityKeys()

  // Stop the browser's prompt if the person leaves this step.
  useEffect(() => () => waiting.current?.abort(), [])

  async function finish(session: Session | undefined) {
    if (session?.status === SessionStatus.anonymous) onTimedOut()
    await form.proceed(session)
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    waiting.current?.abort()
    await finish(await form.submit(event, () => auth.mfaCode(code.trim())))
  }

  async function tryKey() {
    const controller = new AbortController()
    waiting.current = controller
    setKey(KeyState.waiting)
    form.clear()
    try {
      let options: unknown
      try {
        options = await auth.webauthnOptions()
      } catch (error) {
        if (!(error instanceof ApiError && error.status === HttpStatus.unauthenticated)) throw error
        // No sign-in is waiting for a key any more.
        setKey(KeyState.idle)
        form.forget()
        onTimedOut()
        return
      }
      const credential = await askSecurityKey(options, controller.signal)
      const session = await form.run(() => auth.webauthnAuthenticate(credential))
      // `run` reports a key the backend refused; that also counts as the key not working.
      setKey(session ? KeyState.idle : KeyState.failed)
      await finish(session)
    } catch {
      // Stopping the wait is not a failure. Anything else is: the prompt was dismissed, timed out, or the key is not this account's.
      setKey(controller.signal.aborted ? KeyState.idle : KeyState.failed)
    }
  }

  function stopWaiting() {
    waiting.current?.abort()
    setKey(KeyState.idle)
  }

  return (
    <>
      {takesCode && (
        <form noValidate className="space-y-4" onSubmit={(event) => void verify(event)}>
          <FormAlert>{key === KeyState.failed ? '' : form.message}</FormAlert>
          <Field label={codeLabel(types)} error={form.fields.code}>
            {(field) => (
              <Input
                {...field}
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="one-time-code"
                autoFocus
                required
                className={CODE_INPUT}
              />
            )}
          </Field>
          <SubmitButton className={FULL_BUTTON} busy={form.busy}>
            {t.twoStep.verify}
          </SubmitButton>
        </form>
      )}
      {takesKey && (
        <div className={takesCode ? 'mt-6 space-y-3 border-t pt-6' : 'space-y-3'}>
          {key === KeyState.failed && <FormAlert>{takesCode ? t.twoStep.keyFailedOrCode : t.twoStep.keyFailed}</FormAlert>}
          {key === KeyState.waiting ? (
            <div className="flex min-h-10 items-center justify-between gap-3 border bg-card px-3 max-lg:min-h-11" role="status">
              <span className="flex items-center gap-2 font-medium">
                <KeyRound className="size-4 animate-pulse" />
                {t.twoStep.waitingForKey}
              </span>
              <Button variant="link" onClick={stopWaiting}>
                {common.cancel}
              </Button>
            </div>
          ) : (
            <Button variant={takesCode ? 'outline' : 'default'} className={FULL_BUTTON} onClick={() => void tryKey()}>
              <KeyRound />
              {key === KeyState.failed ? t.twoStep.tryKeyAgain : t.twoStep.useKey}
            </Button>
          )}
        </div>
      )}
      <AuthLinks>
        <Button variant="link" onClick={() => void form.startOver()}>
          {t.useAnotherAccount}
        </Button>
      </AuthLinks>
    </>
  )
}
