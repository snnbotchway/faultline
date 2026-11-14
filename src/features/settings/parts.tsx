import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// The bar of a page that sits under Settings: the way back, then where you are.
export function SettingsBar({ org, title, mono, children }: { org: string; title: string; mono?: boolean; children?: ReactNode }) {
  return (
    <PageBar>
      <Link
        to="/$org/settings"
        params={{ org }}
        className="-ml-2 flex h-11 items-center gap-1 px-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        aria-label="Settings"
      >
        <ChevronLeft className="size-4" />
        <span className="max-lg:hidden">Settings</span>
      </Link>
      <h1 className={cn('min-w-0 truncate font-semibold', mono && 'font-mono')}>{title}</h1>
      <span className="ml-auto flex shrink-0 items-center gap-2">{children}</span>
    </PageBar>
  )
}

// The one column every settings page is set in.
export function Sheet({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-4xl flex-1 lg:border-x', className)}>{children}</div>
}

export function Group({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={label}>
      <div className="flex h-9 items-center justify-between border-b bg-muted pr-1 pl-3 md:pl-4 lg:h-8">
        <h2 className="label-caps">{label}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// A button in a group's heading: "New key", "Invite members".
export function GroupAction({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button size="bar" variant="ghost" className={className} {...props} />
}

export const ROW = 'flex min-h-12 w-full items-center gap-3 border-b px-3 text-left md:px-4 lg:min-h-11'
export const ROW_LABEL = 'w-36 shrink-0 font-medium lg:w-52'

// Whether a row is unfolded, for rows built outside `FoldRow`.
export const FoldChevron = ({ open }: { open: boolean }) => (
  <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
)

// A setting that only reports: its name and its value.
export function Row({ label, value, mono, action }: { label: ReactNode; value?: ReactNode; mono?: boolean; action?: ReactNode }) {
  return (
    <div className={ROW}>
      {/* A row with nothing to report gives its whole width to the label. */}
      <span className={value === undefined ? 'min-w-0 flex-1 font-medium' : ROW_LABEL}>{label}</span>
      {value !== undefined && <span className={cn('min-w-0 flex-1 text-muted-foreground', mono && 'mono')}>{value}</span>}
      {action}
    </div>
  )
}

// A setting that leads to its own page.
export function LinkRow({ label, value, mono, ...link }: { label: ReactNode; value?: ReactNode; mono?: boolean } & LinkProps) {
  return (
    <Link {...link} className={cn(ROW, 'hover:bg-accent')}>
      <span className={ROW_LABEL}>{label}</span>
      <span className={cn('min-w-0 flex-1 text-muted-foreground', mono && 'mono')}>{value}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

// A setting that unfolds in place to be changed. Without `onToggle` it only reports.
export function FoldRow({
  label,
  value,
  mono,
  open,
  onToggle,
  children,
}: {
  label: ReactNode
  value?: ReactNode
  mono?: boolean
  open: boolean
  onToggle?: () => void
  children: ReactNode
}) {
  if (!onToggle) return <Row label={label} value={value} mono={mono} />
  return (
    <div className={cn(open && 'bg-card')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={cn(ROW, 'hover:bg-accent', open && 'border-b-0')}>
        <span className={ROW_LABEL}>{label}</span>
        <span className={cn('min-w-0 flex-1 truncate text-muted-foreground', mono && 'mono')}>{value}</span>
        <FoldChevron open={open} />
      </button>
      {open && <div className="flex flex-col gap-4 border-b px-3 pt-1 pb-4 md:px-4 lg:pl-59">{children}</div>}
    </div>
  )
}


export function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined })}
      {error && <FormError id={`${id}-error`}>{error}</FormError>}
    </div>
  )
}

export function FormError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {children}
    </p>
  )
}

// The form inside an unfolded row: one field, Save and Cancel.
export function InlineForm({
  onSubmit,
  onCancel,
  pending,
  error,
  disabled,
  children,
}: {
  onSubmit: () => void
  onCancel: () => void
  pending: boolean
  error?: string
  disabled?: boolean
  children: ReactNode
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!disabled && !pending) onSubmit()
  }
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      {children}
      {error && <FormError>{error}</FormError>}
      <div className="flex gap-2">
        <Button type="submit" variant="default" disabled={disabled || pending} aria-busy={pending}>
          Save
        </Button>
        <Button onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// A short task that keeps the page behind it: a title, a few fields, and the button that does it.
export function FormDialog({
  open,
  onClose,
  title,
  submit,
  onSubmit,
  pending,
  error,
  disabled,
  destructive,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  // The button's label; without it the dialog only shows something and closes with "Done".
  submit?: string
  onSubmit?: () => void
  pending?: boolean
  error?: string
  disabled?: boolean
  destructive?: boolean
  className?: string
  children: ReactNode
}) {
  const send = (event: FormEvent) => {
    event.preventDefault()
    if (!disabled && !pending) onSubmit?.()
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} className={cn('max-lg:top-[5vh]', className)}>
        <form noValidate onSubmit={send} className="flex max-h-[84dvh] flex-col">
          <div className="flex h-11 shrink-0 items-center border-b px-4">
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            {children}
            {error && <FormError>{error}</FormError>}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3">
            {submit ? (
              <>
                <Button onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={disabled || pending} aria-busy={pending}>
                  {submit}
                </Button>
              </>
            ) : (
              <Button variant="default" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Deleting something with data behind it: its name has to be typed first.
export function DeleteDialog({
  open,
  onClose,
  what,
  name,
  loses,
  onDelete,
  pending,
  error,
}: {
  open: boolean
  onClose: () => void
  what: string
  name: string
  loses: string
  onDelete: () => void
  pending: boolean
  error?: string
}) {
  const [typed, setTyped] = useState('')
  return (
    <FormDialog open={open} onClose={onClose} title={`Delete ${what} ${name}`} submit={`Delete ${what}`} destructive onSubmit={onDelete} pending={pending} error={error} disabled={typed !== name}>
      <p className="prose-text">{loses}</p>
      <Field label={`Type ${name} to delete it`}>
        {(field) => <Input {...field} value={typed} onChange={(event) => setTyped(event.target.value)} className="font-mono" autoComplete="off" autoCapitalize="off" spellCheck={false} />}
      </Field>
    </FormDialog>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (next: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex border">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-9 min-w-0 flex-1 border-r px-2 text-sm font-medium -outline-offset-2 last:border-r-0 max-lg:h-11',
            option.value === value ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// How long a copy button says "Copied".
const COPIED_MS = 1500

function useCopy(text: string | (() => Promise<string>)) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(typeof text === 'string' ? text : await text())
    setCopied(true)
    setTimeout(() => setCopied(false), COPIED_MS)
  }
  return { copied, copy }
}

/**
 * Copies a value that may first have to be fetched. `onError` hears about a fetch or clipboard failure.
 * `inBox` draws it as the end of the box that holds the value, ruled off by a hairline.
 */
export function CopyButton({
  text,
  label = 'Copy',
  onError,
  inBox,
  className,
  ...props
}: { text: string | (() => Promise<string>); label?: string; onError?: (error: unknown) => void; inBox?: boolean } & Omit<React.ComponentProps<typeof Button>, 'onClick' | 'onError'>) {
  const { copied, copy } = useCopy(text)
  return (
    <Button
      variant={inBox ? 'ghost' : 'outline'}
      // In a box it takes the box's height, so it has no size of its own.
      size={inBox ? null : undefined}
      className={cn(inBox && 'self-stretch border-0 border-l border-l-border bg-card px-3 -outline-offset-2', className)}
      onClick={() => void copy().catch((error: unknown) => onError?.(error))}
      {...props}
    >
      {copied ? <Check className="text-ok" /> : <Copy />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  )
}

// One value of machine text (a DSN, an invite link) with its copy button. The value wraps, so all of it is on screen.
export function CopyField({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className={cn('flex items-stretch border bg-code', className)}>
      <code aria-label={label} className="mono min-w-0 flex-1 px-3 py-2 leading-normal [overflow-wrap:anywhere] max-lg:py-3">
        {value}
      </code>
      <CopyButton text={value} inBox />
    </div>
  )
}

// Code to paste. A long line breaks where it runs out of room, keeping its indent, so a DSN in a snippet is never cut off.
export function CodeBlock({ code, label, copy = true, className }: { code: string; label: string; copy?: boolean; className?: string }) {
  return (
    <figure className={cn('border bg-code', className)}>
      <figcaption className="flex h-9 items-stretch justify-between border-b pl-3 max-lg:h-11">
        <span className="mono flex min-w-0 items-center truncate text-muted-foreground">{label}</span>
        {copy && <CopyButton text={code} inBox />}
      </figcaption>
      <pre className="mono p-3 leading-code break-all whitespace-pre-wrap">{code}</pre>
    </figure>
  )
}

export type TabItem<T extends string> = { value: T; label: string; count?: number }

// Tabs that are links, so each one has an address. One panel shows at a time.
export function Tabs<T extends string>({ tabs, current, link, label }: { tabs: TabItem<T>[]; current: T; link: (tab: T) => LinkProps; label: string }) {
  return (
    <nav aria-label={label} className="flex h-10 gap-5 overflow-x-auto border-b px-3 md:px-4 max-lg:h-11">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          {...link(tab.value)}
          replace
          aria-current={tab.value === current ? 'page' : undefined}
          className={cn(
            'flex h-full items-center gap-2 border-y-2 border-transparent text-sm font-medium whitespace-nowrap -outline-offset-2',
            tab.value === current ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="mono text-muted-foreground">{tab.count}</span>}
        </Link>
      ))}
    </nav>
  )
}

const initialsOf = (text: string) =>
  text
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

// A person's initials. Someone who has not accepted their invite yet is drawn hollow.
export function Initials({ name, hollow, className }: { name: string; hollow?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center font-mono text-xs font-semibold uppercase',
        hollow ? 'border border-dashed border-foreground/50 text-muted-foreground' : 'bg-foreground text-background',
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="mono shrink-0 border px-1 text-xs whitespace-nowrap text-muted-foreground">{children}</span>
}

export function RowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={ROW}>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      ))}
    </div>
  )
}
