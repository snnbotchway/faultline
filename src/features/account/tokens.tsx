import { useId, useState, type FormEvent } from 'react'
import { RELEASES_SCOPE, TOKEN_LEVELS, TOKEN_RESOURCES, TokenLevel, TokenResource, accountKeys, tokens, type ApiToken, type TokenScope } from '@/api/account'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FormAlert, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ConfirmDialog, TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { CopyButton } from './copy-button'
import { day } from './format'
import { LEVEL_LABELS, RELEASES_LABEL, RESOURCE_LABELS, scopeWords } from './scopes'
import { useAction } from './use-action'

const FIRST_SCOPE: TokenScope = `${TokenResource.project}:${TokenLevel.read}`

// Enough of a token to tell two apart; the whole of it is shown only when it is made.
const PREFIX = 6

function TokenRow({ token }: { token: ApiToken }) {
  const [confirming, setConfirming] = useState(false)
  const revoke = useAction(() => tokens.revoke(token.id), { action: 'revoke that token', refresh: [accountKeys.tokens], onDone: () => setConfirming(false) })
  return (
    <li className="flex items-center gap-3 border-b py-2">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-medium">{token.label || 'No label'}</span>
          <span className="mono text-muted-foreground">
            {token.token.slice(0, PREFIX)}… · {day(token.created)}
          </span>
        </span>
        <span className="block text-sm text-muted-foreground">{scopeWords(token.scopes)}</span>
      </span>
      <Button className="max-lg:h-11" onClick={() => setConfirming(true)}>
        Revoke
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Revoke ${token.label || 'this token'}?`}
        action="Revoke token"
        busy={revoke.busy}
        error={revoke.message}
        onConfirm={() => void revoke.run()}
      />
    </li>
  )
}

export function TokenRows({ list }: { list: ApiToken[] }) {
  if (list.length === 0) return <p className="prose-text border-b py-3 text-muted-foreground">No tokens</p>
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
  const create = useAction(async () => onCreated(await tokens.create(label.trim(), scopes)), { action: 'make that token', refresh: [accountKeys.tokens] })
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
    void create.submit(event, undefined, { fields: scopes.length === 0 ? { scopes: 'Tick at least one thing this token may do.' } : {} })
  }

  return (
    <form noValidate className="space-y-4" onSubmit={submit}>
      <FormAlert>{create.message}</FormAlert>
      <Field label="Label" error={create.fields.label}>
        {(field) => <Input {...field} name="label" value={label} onChange={(event) => setLabel(event.target.value)} required maxLength={255} className="h-10" autoComplete="off" />}
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium" id="token-scopes">
          This token may
        </p>
        <table className="w-full border-y" aria-labelledby="token-scopes">
          <thead>
            <tr className="border-b">
              <td />
              {TOKEN_LEVELS.map((level) => (
                <th key={level} scope="col" className="label-caps w-16 py-2 text-center font-normal">
                  {LEVEL_LABELS[level]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOKEN_RESOURCES.map((resource) => (
              <tr key={resource} className="border-b">
                <th scope="row" className="text-left font-normal">
                  {RESOURCE_LABELS[resource]}
                </th>
                {TOKEN_LEVELS.map((level) => (
                  <td key={level} className="text-center">
                    {box(`${resource}:${level}`, `${RESOURCE_LABELS[resource]}: ${LEVEL_LABELS[level]}`)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="text-left font-normal">
                {RELEASES_LABEL}
              </th>
              <td />
              <td className="text-center">{box(RELEASES_SCOPE, RELEASES_LABEL)}</td>
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
          Create token
        </SubmitButton>
        <Button onClick={onClose}>Cancel</Button>
      </TaskActions>
    </form>
  )
}

export function NewTokenDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (token: ApiToken) => void }) {
  return (
    <TaskDialog open={open} onClose={onClose} title="New API token">
      <TokenForm onCreated={onCreated} onClose={onClose} />
    </TaskDialog>
  )
}

// The only time the whole token is on screen. It stays until the person says they are done.
export function TokenRevealDialog({ token, onClose }: { token: ApiToken | null; onClose: () => void }) {
  return (
    <TaskDialog
      open={token !== null}
      onClose={onClose}
      modal
      quietFocus
      title={
        <>
          Copy <span className="font-semibold">{token?.label}</span> now
        </>
      }
      description="It won't be shown again."
    >
      <code className="mono mb-4 block border bg-code p-3 break-all select-all">{token?.token}</code>
      <TaskActions>
        <CopyButton text={token?.token ?? ''} label="Copy token" variant="default" />
        <Button onClick={onClose}>Done</Button>
      </TaskActions>
    </TaskDialog>
  )
}
