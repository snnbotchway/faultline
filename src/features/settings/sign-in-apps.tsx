import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { SIGN_IN_APPS_MAX, SIGN_IN_APP_NAME_MAX, SIGN_IN_CLIENT_MAX, SIGN_IN_SERVER_URL_MAX, SignInProvider, signInAppActions, signInAppsQuery, type SignInApp } from '@/api/sign-in-apps'
import { stale } from '@/api/stale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChange } from './change'
import { Confirm } from './fields'
import { Field } from '@/components/ui/field'
import { CopyField, FoldRow, FormDialog, Group, GroupAction, Row, RowSkeleton, Segmented } from './parts'
import { useFold } from './rows'
import { useT } from '@/i18n'

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
  const { settings: { signInApps: text }, common } = useT()
  const remove = useChange(text.deleteAction, (app: SignInApp) => signInAppActions.remove(org, app.id!), { stale: [stale.signInApps(org)], onDone: () => setDeleting(undefined) })
  const full = (apps?.length ?? 0) >= SIGN_IN_APPS_MAX
  return (
    <>
      <Group
        label={text.title}
        action={
          apps &&
          !full && (
            <GroupAction onClick={() => setCreating(true)}>
              <Plus />
              {text.new}
            </GroupAction>
          )
        }
      >
        {!apps && <RowSkeleton rows={1} />}
        {apps?.length === 0 && <Row label={text.none} />}
        {apps?.map((app) => (
          <FoldRow key={app.id} label={app.name} value={providerName(app)} open={row.is(String(app.id))} onToggle={() => row.toggle(String(app.id))}>
            <AppAddresses app={app} />
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              {app.serverUrl && (
                <>
                  <dt className="text-muted-foreground">{text.server}</dt>
                  <dd className="mono [overflow-wrap:anywhere]">{app.serverUrl}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{text.clientId}</dt>
              <dd className="mono [overflow-wrap:anywhere]">{app.clientID}</dd>
            </dl>
            <div className="flex gap-2">
              <Button onClick={() => setEditing(app)}>{common.edit}</Button>
              <Button variant="destructive" onClick={() => setDeleting(app)}>
                {common.delete}
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
        title={text.deleteTitle(deleting?.name)}
        confirm={text.delete}
        destructive
        onConfirm={() => deleting && remove.run(deleting)}
        pending={remove.pending}
        error={remove.error}
      >
        {text.needsOther}
      </Confirm>
    </>
  )
}

// The two addresses an app hands out: the one to register at the provider, and the organization's sign-in page.
function AppAddresses({ app }: { app: SignInApp }) {
  const text = useT().settings.signInApps
  return (
    <>
      {app.callbackUrl && <Field label={text.redirect}>{() => <CopyField value={app.callbackUrl!} label={text.redirectOf(app.name)} />}</Field>}
      <Field label={text.signInPage}>{() => <CopyField value={app.loginUrl} label={text.signInPageOf(app.name)} />}</Field>
    </>
  )
}

/**
 * Create a sign-in app, or edit one. The provider is fixed once the app exists, because the redirect address depends
 * on it. The backend makes that address when it creates the app, so a new app's dialog shows it next, to give the provider.
 */
function SignInAppDialog({ org, app, onClose, onCreated }: { org: string; app?: SignInApp; onClose: () => void; onCreated?: (app: SignInApp) => void }) {
  const [provider, setProvider] = useState<SignInProvider>(SignInProvider.openIdConnect)
  const [name, setName] = useState(app?.name ?? '')
  const [serverUrl, setServerUrl] = useState(app?.serverUrl ?? '')
  const [clientID, setClientID] = useState(app?.clientID ?? '')
  const [secret, setSecret] = useState('')
  const [checked, setChecked] = useState(false)
  const [created, setCreated] = useState<SignInApp>()
  const google = app ? app.brand === SignInProvider.google : provider === SignInProvider.google
  const { settings: t, common } = useT()
  const text = t.signInApps

  const problems = {
    name: !name.trim() ? text.needsName : undefined,
    serverUrl: google ? undefined : !serverUrl.trim() ? text.needsAddress : !/^https:\/\/\S+$/.test(serverUrl.trim()) ? text.needsHttps : undefined,
    clientID: !clientID.trim() ? text.needsClientId : undefined,
    secret: !app && !secret.trim() ? text.needsSecret : undefined,
  }
  const save = useChange(
    app ? text.changeAction : text.createAction,
    () => {
      const input = { name: name.trim(), serverUrl: google ? null : serverUrl.trim(), clientID: clientID.trim(), clientSecret: secret.trim() || null }
      return app ? signInAppActions.update(org, app.id!, input) : signInAppActions.create(org, provider, input)
    },
    {
      stale: [stale.signInApps(org)],
      onDone: (saved) => {
        if (app) return onClose()
        setCreated(saved)
        onCreated?.(saved)
      },
    },
  )
  const submit = () => {
    setChecked(true)
    if (!Object.values(problems).some(Boolean)) save.run()
  }
  const shown = (problem?: string) => (checked ? problem : undefined)

  if (created)
    return (
      <FormDialog open onClose={onClose} title={text.ready(created.name)}>
        <AppAddresses app={created} />
      </FormDialog>
    )
  return (
    <FormDialog open onClose={onClose} title={app ? app.name : text.new} submit={app ? common.save : text.create} onSubmit={submit} pending={save.pending} error={save.error}>
      {!app && (
        <Segmented
          label={text.provider}
          value={provider}
          onChange={setProvider}
          options={Object.values(SignInProvider).map((value) => ({ value, label: PROVIDER_NAME[value] }))}
        />
      )}
      <Field label={t.name} error={shown(problems.name)}>
        {(field) => <Input {...field} autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={SIGN_IN_APP_NAME_MAX} autoComplete="off" />}
      </Field>
      {!google && (
        <Field label={text.providerAddress} error={shown(problems.serverUrl)}>
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
      <Field label={text.clientId} error={shown(problems.clientID)}>
        {(field) => (
          <Input {...field} value={clientID} onChange={(event) => setClientID(event.target.value)} maxLength={SIGN_IN_CLIENT_MAX} autoComplete="off" autoCapitalize="off" spellCheck={false} className="font-mono" />
        )}
      </Field>
      <Field label={app ? text.newSecret : text.secret} error={shown(problems.secret)}>
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
      {!app && <p className="text-sm text-muted-foreground">{text.redirectLater}</p>}
    </FormDialog>
  )
}
