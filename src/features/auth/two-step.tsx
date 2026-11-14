import { KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MfaType, auth } from '@/api/auth'
import { SignInField, checkCode, signInProblems } from '@/api/sign-in-errors'
import { Button } from '@/components/ui/button'
import { Field, FormAlert } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { askSecurityKey, supportsSecurityKeys } from '@/lib/webauthn'
import { AuthLinks } from './frame'
import { SUBMIT } from './forms'
import { useSessionForm } from './session-form'

const KeyState = { idle: 'idle', waiting: 'waiting', failed: 'failed' } as const
type KeyState = (typeof KeyState)[keyof typeof KeyState]

const codeLabel = (types: MfaType[]) => {
  const app = types.includes(MfaType.totp)
  const recovery = types.includes(MfaType.recoveryCodes)
  if (app && recovery) return 'Authenticator or recovery code'
  return app ? 'Authenticator code' : 'Recovery code'
}

// The second step of signing in: a code from the authenticator app, a recovery code, or a security key.
export function TwoStepCheck({ types }: { types: MfaType[] }) {
  const form = useSessionForm(signInProblems)
  const [code, setCode] = useState('')
  const [key, setKey] = useState<KeyState>(KeyState.idle)
  const waiting = useRef<AbortController | null>(null)
  const takesCode = types.includes(MfaType.totp) || types.includes(MfaType.recoveryCodes)
  const takesKey = types.includes(MfaType.webauthn) && supportsSecurityKeys()

  // Stop the browser's prompt if the person leaves this step.
  useEffect(() => () => waiting.current?.abort(), [])

  async function verify(event: FormEvent<HTMLFormElement>) {
    waiting.current?.abort()
    await form.proceed(await form.submit(event, () => auth.mfaCode(code.trim()), checkCode(code)))
  }

  async function tryKey() {
    const controller = new AbortController()
    waiting.current = controller
    setKey(KeyState.waiting)
    form.clearMessage()
    try {
      const credential = await askSecurityKey(await auth.webauthnOptions(), controller.signal)
      const session = await form.run(() => auth.webauthnAuthenticate(credential))
      // `run` reports a key the backend refused; that also counts as the key not working.
      setKey(session ? KeyState.idle : KeyState.failed)
      await form.proceed(session)
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
          <Field label={codeLabel(types)} error={form.errors.code}>
            {(field) => (
              <Input
                {...field}
                name={SignInField.code}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="one-time-code"
                autoFocus
                className="h-10 font-mono tracking-[0.2em]"
              />
            )}
          </Field>
          <Button type="submit" variant="default" className={SUBMIT} disabled={form.busy} aria-busy={form.busy}>
            Verify
          </Button>
        </form>
      )}
      {takesKey && (
        <div className={takesCode ? 'mt-6 space-y-3 border-t pt-6' : 'space-y-3'}>
          {key === KeyState.failed && <FormAlert>{takesCode ? "That security key didn't work. Try it again, or enter a code." : "That security key didn't work. Try it again."}</FormAlert>}
          {key === KeyState.waiting ? (
            <div className="flex min-h-10 items-center justify-between gap-3 border bg-card px-3 max-lg:min-h-11" role="status">
              <span className="flex items-center gap-2 font-medium">
                <KeyRound className="size-4 animate-pulse" />
                Waiting for your security key
              </span>
              <Button variant="link" onClick={stopWaiting}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant={takesCode ? 'outline' : 'default'} className={SUBMIT} onClick={() => void tryKey()}>
              <KeyRound />
              {key === KeyState.failed ? 'Try the security key again' : 'Use a security key'}
            </Button>
          )}
        </div>
      )}
      <AuthLinks>
        <Button variant="link" onClick={() => void form.startOver()}>
          Use another account
        </Button>
      </AuthLinks>
    </>
  )
}
