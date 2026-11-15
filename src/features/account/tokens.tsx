import { useId, useState, type FormEvent } from 'react'
import { RELEASES_SCOPE, TOKEN_LEVELS, TOKEN_RESOURCES, TokenLevel, TokenResource, accountKeys, tokens, type ApiToken, type TokenScope } from '@/api/account'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FormAlert, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ConfirmDialog, TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { CopyButton } from './copy-button'
import { day } from './format'
import { RowButton } from '@/components/ui/row-button'
import { useT } from '@/i18n'
import { scopeWords } from './scopes'
import { useAction } from './use-action'

const FIRST_SCOPE: TokenScope = `${TokenResource.project}:${TokenLevel.read}`

// Enough of a token to tell two apart; the whole of it is shown only when it is made.
const PREFIX = 6

function TokenRow({ token }: { token: ApiToken }) {
  const [confirming, setConfirming] = useState(false)
  const text = useT().account.tokens
  const revoke = useAction(() => tokens.revoke(token.id), { action: text.revokeAction, refresh: [accountKeys.tokens], onDone: () => setConfirming(false) })
  return (
    <li className="flex items-center gap-3 border-b py-2">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-medium">{token.label || text.noLabel}</span>
          <span className="mono text-muted-foreground">
            {token.token.slice(0, PREFIX)}… · {day(token.created)}
          </span>
        </span>
        <span className="block text-sm text-muted-foreground">{scopeWords(token.scopes)}</span>
      </span>
      <RowButton danger onClick={() => setConfirming(true)}>
        {text.revoke}
      </RowButton>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={text.revokeTitle(token.label)}
        action={text.revokeToken}
        busy={revoke.busy}
        error={revoke.message}
        onConfirm={() => void revoke.run()}
      />
    </li>
  )
}

export function TokenRows({ list }: { list: ApiToken[] }) {
  const t = useT()
  if (list.length === 0) return <p className="border-b py-3 text-muted-foreground">{t.account.tokens.none}</p>
  return (
    <ul>
      {list.map((token) => (
        <TokenRow key={token.id} token={token} />
      ))}
    </ul>
  )
}

function TokenForm({ onCreated, onClose }: { onCreated: (token: ApiToken) => void; onClose: () => void }) {
  const [label, setLabel] = useState('')
  const [scopes, setScopes] = useState<TokenScope[]>([])
  const { account: { tokens: text }, common } = useT()
  const create = useAction(async () => onCreated(await tokens.create(label.trim(), scopes)), { action: text.createAction, refresh: [accountKeys.tokens] })
  const toggle = (scope: TokenScope) => setScopes((list) => (list.includes(scope) ? list.filter((item) => item !== scope) : [...list, scope]))
  const scopesErrorId = useId()
  // The first box stands for the whole set when none is ticked.
  const box = (scope: TokenScope, name: string) => (
    <Checkbox
      hit
      checked={scopes.includes(scope)}
      onCheckedChange={() => toggle(scope)}
      aria-label={name}
      {...(scope === FIRST_SCOPE && { 'data-field': 'scopes', 'aria-describedby': create.fields.scopes ? scopesErrorId : undefined })}
    />
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    void create.submit(event, undefined, { fields: scopes.length === 0 ? { scopes: text.tickOne } : {} })
  }

  return (
    <form noValidate className="space-y-4" onSubmit={submit}>
      <FormAlert>{create.message}</FormAlert>
      <Field label={text.label} error={create.fields.label}>
        {(field) => <Input {...field} name="label" value={label} onChange={(event) => setLabel(event.target.value)} required maxLength={255} className="h-10" autoComplete="off" />}
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium" id="token-scopes">
          {text.mayDo}
        </p>
        <table className="w-full border-y" aria-labelledby="token-scopes">
          <thead>
            <tr className="border-b">
              <td />
              {TOKEN_LEVELS.map((level) => (
                <th key={level} scope="col" className="label-caps w-16 py-2 text-center font-normal">
                  {text.levels[level]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOKEN_RESOURCES.map((resource) => (
              <tr key={resource} className="border-b">
                <th scope="row" className="text-left font-normal">
                  {text.resources[resource]}
                </th>
                {TOKEN_LEVELS.map((level) => (
                  <td key={level} className="text-center">
                    {box(`${resource}:${level}`, common.valueName(text.resources[resource], text.levels[level]))}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="text-left font-normal">
                {text.releases}
              </th>
              <td />
              <td className="text-center">{box(RELEASES_SCOPE, text.releases)}</td>
              <td />
            </tr>
          </tbody>
        </table>
        <FieldError id={scopesErrorId} className="mt-2">
          {create.fields.scopes}
        </FieldError>
      </div>
      <TaskActions>
        <SubmitButton busy={create.busy}>
          {text.create}
        </SubmitButton>
        <Button onClick={onClose}>{common.cancel}</Button>
      </TaskActions>
    </form>
  )
}

export function NewTokenDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (token: ApiToken) => void }) {
  const t = useT()
  return (
    <TaskDialog open={open} onClose={onClose} title={t.account.tokens.newTitle}>
      <TokenForm onCreated={onCreated} onClose={onClose} />
    </TaskDialog>
  )
}

// The only time the whole token is on screen. It stays until the person says they are done.
export function TokenRevealDialog({ token, onClose }: { token: ApiToken | null; onClose: () => void }) {
  const { account: { tokens: text }, common } = useT()
  return (
    <TaskDialog
      open={token !== null}
      onClose={onClose}
      modal
      quietFocus
      title={text.copyNow(<span className="font-semibold">{token?.label}</span>)}
      description={text.notShownAgain}
    >
      <code className="mono mb-4 block border bg-code p-3 break-all select-all">{token?.token}</code>
      <TaskActions>
        <CopyButton text={token?.token ?? ''} label={text.copyToken} variant="default" />
        <Button onClick={onClose}>{common.done}</Button>
      </TaskActions>
    </TaskDialog>
  )
}
