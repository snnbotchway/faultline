import { Plus } from 'lucide-react'
import { useState } from 'react'
import { PROJECT_KEY_NAME_MAX, projectActions, type ProjectKey } from '@/api/projects'
import { stale } from '@/api/stale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChange } from './change'
import { Confirm } from './fields'
import { Field } from '@/components/ui/field'
import { CopyField, FoldRow, FormDialog, Group, GroupAction, Row, RowSkeleton } from './parts'
import { useFold } from './rows'
import { messages, useT } from '@/i18n'

// A key without a name goes by the start of its id, which is also how its DSN begins.
const keyName = (key: ProjectKey) => key.name || key.label || messages().settings.keys.keyName(key.id.slice(0, 8))

// GlitchTip 7.0.0 ignores changes to a key and does not enforce a key's rate limit, so a key is only made, read and deleted.
export function Keys({ org, slug, keys, write, admin }: { org: string; slug: string; keys?: ProjectKey[]; write: boolean; admin: boolean }) {
  const row = useFold(keys?.length === 1 ? keys[0]!.id : undefined)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<ProjectKey>()
  const text = useT().settings.keys
  const remove = useChange(text.deleteAction, (key: ProjectKey) => projectActions.removeKey(org, slug, key.id), { stale: [stale.project(org, slug)], onDone: () => setDeleting(undefined) })
  return (
    <>
      <Group
        label={text.title}
        action={
          write && (
            <GroupAction onClick={() => setCreating(true)}>
              <Plus />
              {text.newKey}
            </GroupAction>
          )
        }
      >
        {!keys && <RowSkeleton rows={2} />}
        {keys?.length === 0 && <Row label={text.none} />}
        {keys?.map((key) => (
          <FoldRow key={key.id} label={keyName(key)} mono wrap value={key.dsn.public} open={row.is(key.id)} onToggle={() => row.toggle(key.id)}>
            <Field label={text.dsn}>{() => <CopyField value={key.dsn.public ?? ''} label={text.dsnOf(keyName(key))} />}</Field>
            {key.dsn.security && <Field label={text.securityAddress}>{() => <CopyField value={key.dsn.security!} label={text.securityAddress} />}</Field>}
            {admin && (
              <Button variant="destructive" className="self-start" onClick={() => setDeleting(key)}>
                {text.delete}
              </Button>
            )}
          </FoldRow>
        ))}
      </Group>
      {creating && <NewKeyDialog org={org} slug={slug} onClose={() => setCreating(false)} />}
      <Confirm
        open={!!deleting}
        onClose={() => {
          setDeleting(undefined)
          remove.clear()
        }}
        title={text.deleteTitle(deleting && keyName(deleting))}
        confirm={text.delete}
        destructive
        onConfirm={() => deleting && remove.run(deleting)}
        pending={remove.pending}
        error={remove.error}
      >
        {text.stopsRecording}
      </Confirm>
    </>
  )
}

function NewKeyDialog({ org, slug, onClose }: { org: string; slug: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [checked, setChecked] = useState(false)
  const t = useT().settings
  const save = useChange(t.keys.createAction, () => projectActions.createKey(org, slug, name.trim()), { stale: [stale.project(org, slug)], onDone: onClose })
  const submit = () => {
    setChecked(true)
    if (name.trim()) save.run()
  }
  return (
    <FormDialog open onClose={onClose} title={t.keys.newTitle} submit={t.keys.create} onSubmit={submit} pending={save.pending} error={save.error}>
      <Field label={t.name} error={checked && !name.trim() ? t.keys.needsName : undefined}>
        {(field) => <Input {...field} autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={PROJECT_KEY_NAME_MAX} autoComplete="off" />}
      </Field>
    </FormDialog>
  )
}
