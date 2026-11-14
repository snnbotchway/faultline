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

// A key without a name goes by the start of its id, which is also how its DSN begins.
const keyName = (key: ProjectKey) => key.name || key.label || `Key ${key.id.slice(0, 8)}`

// GlitchTip 7.0.0 ignores changes to a key and does not enforce a key's rate limit, so a key is only made, read and deleted.
export function Keys({ org, slug, keys, write, admin }: { org: string; slug: string; keys?: ProjectKey[]; write: boolean; admin: boolean }) {
  const row = useFold(keys?.length === 1 ? keys[0]!.id : undefined)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<ProjectKey>()
  const remove = useChange('delete the key', (key: ProjectKey) => projectActions.removeKey(org, slug, key.id), { stale: [stale.project(org, slug)], onDone: () => setDeleting(undefined) })
  return (
    <>
      <Group
        label="Client keys"
        action={
          write && (
            <GroupAction onClick={() => setCreating(true)}>
              <Plus />
              New key
            </GroupAction>
          )
        }
      >
        {!keys && <RowSkeleton rows={2} />}
        {keys?.length === 0 && <Row label="No client keys" />}
        {keys?.map((key) => (
          <FoldRow key={key.id} label={keyName(key)} mono value={key.dsn.public} open={row.is(key.id)} onToggle={() => row.toggle(key.id)}>
            <Field label="DSN">{() => <CopyField value={key.dsn.public ?? ''} label={`DSN of ${keyName(key)}`} />}</Field>
            {key.dsn.security && <Field label="Security report address">{() => <CopyField value={key.dsn.security!} label="Security report address" />}</Field>}
            {admin && (
              <Button variant="destructive" className="self-start" onClick={() => setDeleting(key)}>
                Delete key
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
        title={`Delete ${deleting ? keyName(deleting) : 'key'}?`}
        confirm="Delete key"
        destructive
        onConfirm={() => deleting && remove.run(deleting)}
        pending={remove.pending}
        error={remove.error}
      >
        Anything still sending with this key's DSN stops being recorded.
      </Confirm>
    </>
  )
}

function NewKeyDialog({ org, slug, onClose }: { org: string; slug: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [checked, setChecked] = useState(false)
  const save = useChange('create the key', () => projectActions.createKey(org, slug, name.trim()), { stale: [stale.project(org, slug)], onDone: onClose })
  const submit = () => {
    setChecked(true)
    if (name.trim()) save.run()
  }
  return (
    <FormDialog open onClose={onClose} title="New client key" submit="Create key" onSubmit={submit} pending={save.pending} error={save.error}>
      <Field label="Name" error={checked && !name.trim() ? 'Give the key a name.' : undefined}>
        {(field) => <Input {...field} autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={PROJECT_KEY_NAME_MAX} autoComplete="off" />}
      </Field>
    </FormDialog>
  )
}
