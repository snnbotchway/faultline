import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { RecipientType, ZULIP_TOPIC, type RecipientInput } from '@/api/alerts'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { RECIPIENTS, isAddress, recipientMeta, recipientTarget, withScheme } from './recipient-kinds'

// A recipient on a rule's row: its kind, with where it goes on hover. A webhook address is a secret, so only its host is shown.
export function RecipientChip({ recipient }: { recipient: { recipientType: string; url?: string | null } }) {
  const meta = recipientMeta(recipient)
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm" title={recipientTarget(recipient).host || undefined}>
      <meta.icon className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{meta.label}</span>
    </span>
  )
}

// A recipient in the editor: its kind, an address short enough to fit (the host gives way first), and remove.
export function RecipientTag({ recipient, onRemove }: { recipient: RecipientInput; onRemove: () => void }) {
  const meta = recipientMeta(recipient)
  const { host, tail } = recipientTarget(recipient)
  return (
    <li className="flex h-9 max-w-full min-w-0 items-center gap-2 border bg-background pl-3 max-lg:h-11" title={host || undefined}>
      <meta.icon className="size-3 shrink-0 text-muted-foreground" />
      <span className="shrink-0 text-sm font-medium">{meta.label}</span>
      <span className="mono flex min-w-0 flex-1 text-xs text-muted-foreground">
        <span className="truncate">{host}</span>
        {tail !== undefined && <span className="shrink-0">/…/{tail}</span>}
      </span>
      <button
        type="button"
        aria-label={`Remove ${meta.label}`}
        title={`Remove ${meta.label}`}
        onClick={onRemove}
        className="grid h-full w-8 shrink-0 cursor-pointer place-items-center border-l text-muted-foreground hover:bg-accent hover:text-foreground max-lg:w-11"
      >
        <X className="size-3" />
      </button>
    </li>
  )
}

type ZulipFields = { botEmail: string; apiKey: string; channel: string; topic: string }
const NO_ZULIP: ZulipFields = { botEmail: '', apiKey: '', channel: '', topic: ZULIP_TOPIC }

// Pick a kind, then give its address. Email goes to the project's members, so it needs none and is offered once.
export function AddRecipient({ hasEmail, onAdd }: { hasEmail: boolean; onAdd: (recipient: RecipientInput) => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<RecipientType>()
  const [url, setUrl] = useState('')
  const [zulip, setZulip] = useState(NO_ZULIP)
  const [tried, setTried] = useState(false)
  const reset = () => {
    setType(undefined)
    setUrl('')
    setZulip(NO_ZULIP)
    setTried(false)
  }
  const add = (recipient: RecipientInput) => {
    onAdd(recipient)
    setOpen(false)
    reset()
  }
  const urlError = tried && !isAddress(url) ? 'Enter the full address, such as https://example.com/hook.' : undefined
  const missing = (value: string) => (tried && !value.trim() ? 'Fill this in.' : undefined)
  const submit = () => {
    setTried(true)
    if (!type || !isAddress(url)) return
    if (type === RecipientType.zulip) {
      if (!zulip.botEmail.trim() || !zulip.apiKey.trim() || !zulip.channel.trim()) return
      add({ recipientType: type, url: withScheme(url), ...zulip, topic: zulip.topic.trim() || ZULIP_TOPIC })
    } else if (type !== RecipientType.email) add({ recipientType: type, url: withScheme(url) })
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <PopoverTrigger asChild>
        <Button className="h-9 max-lg:h-11">
          <Plus />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(type ? 'w-80' : 'w-56 p-1')}>
        {type ? (
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              submit()
            }}
          >
            <Field label={type === RecipientType.zulip ? 'Zulip address' : `${RECIPIENTS[type].label} address`} error={urlError}>
              {(props) => <Input {...props} autoFocus className="font-mono" inputMode="url" value={url} placeholder={RECIPIENTS[type].placeholder} onChange={(event) => setUrl(event.target.value)} />}
            </Field>
            {type === RecipientType.zulip && (
              <>
                <Field label="Bot email" error={missing(zulip.botEmail)}>
                  {(props) => <Input {...props} type="email" value={zulip.botEmail} onChange={(event) => setZulip({ ...zulip, botEmail: event.target.value })} />}
                </Field>
                <Field label="API key" error={missing(zulip.apiKey)}>
                  {(props) => <Input {...props} className="font-mono" value={zulip.apiKey} onChange={(event) => setZulip({ ...zulip, apiKey: event.target.value })} />}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Channel" error={missing(zulip.channel)}>
                    {(props) => <Input {...props} value={zulip.channel} onChange={(event) => setZulip({ ...zulip, channel: event.target.value })} />}
                  </Field>
                  <Field label="Topic">{(props) => <Input {...props} value={zulip.topic} onChange={(event) => setZulip({ ...zulip, topic: event.target.value })} />}</Field>
                </div>
              </>
            )}
            <Button type="submit" variant="default" className="max-lg:h-11">
              Add {RECIPIENTS[type].label}
            </Button>
          </form>
        ) : (
          <ul aria-label="Recipient kinds">
            {(Object.keys(RECIPIENTS) as RecipientType[])
              .filter((value) => value !== RecipientType.email || !hasEmail)
              .map((value) => {
                const meta = RECIPIENTS[value]
                return (
                  <li key={value}>
                    <button
                      type="button"
                      onClick={() => (value === RecipientType.email ? add({ recipientType: RecipientType.email, url: '' }) : setType(value))}
                      className="flex h-8 w-full cursor-pointer items-center gap-2 px-2 text-left text-sm hover:bg-accent max-lg:h-11"
                    >
                      <meta.icon className="size-3 text-muted-foreground" />
                      {meta.label}
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
