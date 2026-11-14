// THROWAWAY PROTOTYPE. Content blocks the variants arrange differently: the key dialog, SDK snippets, the first-event state.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { NOW, type ProjectKey } from './data'
import { CodeBlock, Field, Modal, Select } from './kit'
import { platformOf, type Platform } from './platforms'

const WINDOWS = [
  { seconds: 60, label: 'minute' },
  { seconds: 3600, label: 'hour' },
  { seconds: 86400, label: 'day' },
]

export const rateLimitText = (key: ProjectKey) => {
  if (!key.rateLimit) return 'No limit'
  const window = WINDOWS.find((w) => w.seconds === key.rateLimit?.window)?.label ?? `${key.rateLimit.window}s`
  return `${key.rateLimit.count} / ${window}`
}

// Create or edit a client key: its name and how many events it accepts.
export function KeyDialog({ open, onClose, keyItem }: { open: boolean; onClose: () => void; keyItem?: ProjectKey }) {
  const [name, setName] = useState(keyItem?.name ?? '')
  const [limited, setLimited] = useState(Boolean(keyItem?.rateLimit))
  const [count, setCount] = useState(String(keyItem?.rateLimit?.count ?? 1000))
  const [window, setWindow] = useState(String(keyItem?.rateLimit?.window ?? 60))
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={keyItem ? 'Edit client key' : 'New client key'}
      footer={
        <>
          <Button className="max-lg:h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" className="max-lg:h-11" disabled={!name.trim()} onClick={onClose}>
            {keyItem ? 'Save' : 'Create key'}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Rate limit">
        <Select value={limited ? 'on' : 'off'} onChange={(event) => setLimited(event.target.value === 'on')}>
          <option value="off">No limit</option>
          <option value="on">Limit events</option>
        </Select>
      </Field>
      {limited && (
        <div className="flex items-end gap-2">
          <Field label="Events" className="flex-1">
            <Input value={count} onChange={(event) => setCount(event.target.value)} inputMode="numeric" className="font-mono" />
          </Field>
          <Field label="Per" className="flex-1">
            <Select value={window} onChange={(event) => setWindow(event.target.value)}>
              {WINDOWS.map((w) => (
                <option key={w.seconds} value={w.seconds}>
                  {w.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  )
}

// The two things to paste: the install command and the init code with the DSN already in it.
export function Snippets({ platform, dsn, wrap, className }: { platform: Platform | undefined; dsn: string; wrap?: boolean; className?: string }) {
  const chosen = platform ?? platformOf('other')!
  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      {chosen.install && <CodeBlock label="Install" code={chosen.install} wrap={wrap} />}
      <CodeBlock label={chosen.file} code={chosen.code(dsn)} wrap={wrap} />
    </div>
  )
}

// Nothing loops: the state is a hollow level square and a sentence, and it changes when the event lands.
export function FirstEvent({ arrived, className }: { arrived: boolean; className?: string }) {
  return (
    <div className={cn('flex min-h-11 items-center gap-2.5 border px-3', arrived ? 'border-ok/60' : 'border-dashed', className)} role="status">
      <span className={cn('size-2.5 shrink-0', arrived ? 'bg-ok' : 'border border-foreground/60')} />
      <span className="font-medium">{arrived ? 'First event received' : 'Waiting for the first event'}</span>
    </div>
  )
}

const dayFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' })

// The shared 14-day axis, labelled once above a column of traces.
export function AxisLabel({ className }: { className?: string }) {
  const start = new Date(NOW.getTime() - 13 * 24 * 3600_000)
  return (
    <span className={cn('mono flex justify-between text-xs text-muted-foreground', className)}>
      <span>{dayFormat.format(start)}</span>
      <span>today</span>
    </span>
  )
}

export const dateText = (time: string) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(time))
