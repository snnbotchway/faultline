import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { SIGN_IN_APPS_MAX, SIGN_IN_APP_NAME_MAX, SIGN_IN_CLIENT_MAX, SIGN_IN_SERVER_URL_MAX, SignInProvider, signInAppActions, signInAppsQuery, type SignInApp } from '@/api/sign-in-apps'
import { stale } from '@/api/stale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChange } from './change'
import { Confirm } from './fields'
import { CopyField, Field, FoldRow, FormDialog, Group, GroupAction, Row, RowSkeleton, Segmented } from './parts'
import { useFold } from './rows'

const PROVIDER_NAME: Record<SignInProvider, string> = { [SignInProvider.openIdConnect]: 'OpenID Connect', [SignInProvider.google]: 'Google' }
const providerName = (app: SignInApp) => PROVIDER_NAME[app.brand as SignInProvider] ?? app.brand

/**
 * The organization's own single sign-on: OpenID Connect providers (or Google) its people can sign in with.
 * Only managers and owners may see or change them.
 */
export function SignInApps({ org }: { org: string }) {
  const apps = useQuery(signInAppsQuery(org)).data
  const row = useFold()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SignInApp>()
  const [deleting, setDeleting] = useState<SignInApp>()
  const remove = useChange('delete the sign-in app', (app: SignInApp) => signInAppActions.remove(org, app.id!), { stale: [stale.signInApps(org)], onDone: () => setDeleting(undefined) })
  const full = (apps?.length ?? 0) >= SIGN_IN_APPS_MAX
  return (
    <>
      <Group
        label="Sign-in apps"
        action={
          apps &&
          !full && (
            <GroupAction onClick={() => setCreating(true)}>
              <Plus />
              New sign-in app
            </GroupAction>
          )
        }
      >
        {!apps && <RowSkeleton rows={1} />}
        {apps?.length === 0 && <Row label="No sign-in apps yet" />}
        {apps?.map((app) => (
          <FoldRow key={app.id} label={app.name} value={providerName(app)} open={row.is(String(app.id))} onToggle={() => row.toggle(String(app.id))}>
            {app.callbackUrl && <Field label="Redirect address for the provider">{() => <CopyField value={app.callbackUrl!} label={`Redirect address of ${app.name}`} />}</Field>}
            <Field label="Sign-in page">{() => <CopyField value={app.loginUrl} label={`Sign-in page of ${app.name}`} />}</Field>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              {app.serverUrl && (
                <>
                  <dt className="text-muted-foreground">Server</dt>
                  <dd className="mono [overflow-wrap:anywhere]">{app.serverUrl}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Client ID</dt>
              <dd className="mono [overflow-wrap:anywhere]">{app.clientID}</dd>
            </dl>
            <div className="flex gap-2">
              <Button onClick={() => setEditing(app)}>
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setDeleting(app)}>
                Delete
              </Button>
            </div>
          </FoldRow>
        ))}
      </Group>
      {creating && <SignInAppDialog org={org} onClose={() => setCreating(false)} onCreated={(app) => row.toggle(String(app.id))} />}
      {editing && <SignInAppDialog org={org} app={editing} onClose={() => setEditing(undefined)} />}
      <Confirm
        open={!!deleting}
        onClose={() => {
          setDeleting(undefined)
          remove.clear()
        }}
        title={`Delete ${deleting?.name ?? 'sign-in app'}?`}
        confirm="Delete sign-in app"
        destructive
        onConfirm={() => deleting && remove.run(deleting)}
        pending={remove.pending}
        error={remove.error}
      >
        People who sign in with it will need a password or another sign-in app.
      </Confirm>
    </>
  )
}

// Create a sign-in app, or edit one. The provider is fixed once the app exists, because the redirect address depends on it.
function SignInAppDialog({ org, app, onClose, onCreated }: { org: string; app?: SignInApp; onClose: () => void; onCreated?: (app: SignInApp) => void }) {
  const [provider, setProvider] = useState<SignInProvider>(SignInProvider.openIdConnect)
  const [name, setName] = useState(app?.name ?? '')
  const [serverUrl, setServerUrl] = useState(app?.serverUrl ?? '')
  const [clientID, setClientID] = useState(app?.clientID ?? '')
  const [secret, setSecret] = useState('')
  const [checked, setChecked] = useState(false)
  const google = app ? app.brand === SignInProvider.google : provider === SignInProvider.google

  const problems = {
    name: !name.trim() ? 'Give the app a name.' : undefined,
    serverUrl: google ? undefined : !serverUrl.trim() ? "Enter the provider's address." : !/^https:\/\/\S+$/.test(serverUrl.trim()) ? 'Use an address that starts with https://.' : undefined,
    clientID: !clientID.trim() ? 'Enter the client ID.' : undefined,
    secret: !app && !secret.trim() ? 'Enter the client secret.' : undefined,
  }
  const save = useChange(
    app ? 'change the sign-in app' : 'create the sign-in app',
    () => {
      const input = { name: name.trim(), serverUrl: google ? null : serverUrl.trim(), clientID: clientID.trim(), clientSecret: secret.trim() || null }
      return app ? signInAppActions.update(org, app.id!, input) : signInAppActions.create(org, provider, input)
    },
    {
      stale: [stale.signInApps(org)],
      onDone: (saved) => {
        onClose()
        onCreated?.(saved)
      },
    },
  )
  const submit = () => {
    setChecked(true)
    if (!Object.values(problems).some(Boolean)) save.run()
  }
  const shown = (problem?: string) => (checked ? problem : undefined)

  return (
    <FormDialog open onClose={onClose} title={app ? app.name : 'New sign-in app'} submit={app ? 'Save' : 'Create app'} onSubmit={submit} pending={save.pending} error={save.error}>
      {!app && (
        <Segmented
          label="Provider"
          value={provider}
          onChange={setProvider}
          options={Object.values(SignInProvider).map((value) => ({ value, label: PROVIDER_NAME[value] }))}
        />
      )}
      <Field label="Name" error={shown(problems.name)}>
        {(field) => <Input {...field} autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={SIGN_IN_APP_NAME_MAX} autoComplete="off" />}
      </Field>
      {!google && (
        <Field label="Provider address" error={shown(problems.serverUrl)}>
          {(field) => (
            <Input
              {...field}
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={SIGN_IN_SERVER_URL_MAX}
              className="font-mono"
            />
          )}
        </Field>
      )}
      <Field label="Client ID" error={shown(problems.clientID)}>
        {(field) => (
          <Input {...field} value={clientID} onChange={(event) => setClientID(event.target.value)} maxLength={SIGN_IN_CLIENT_MAX} autoComplete="off" autoCapitalize="off" spellCheck={false} className="font-mono" />
        )}
      </Field>
      <Field label={app ? 'New client secret' : 'Client secret'} error={shown(problems.secret)}>
        {(field) => (
          <Input
            {...field}
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            maxLength={SIGN_IN_CLIENT_MAX}
            autoComplete="new-password"
            className="font-mono"
          />
        )}
      </Field>
    </FormDialog>
  )
}
