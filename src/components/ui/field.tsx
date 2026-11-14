import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'

// A button at a field's height (44px on touch), and one that also spans the column, such as a form's main action.
export const FIELD_BUTTON = 'h-10 max-lg:h-11'
export const FULL_BUTTON = `${FIELD_BUTTON} w-full`
// A one-time code being typed, so each digit stands apart.
export const CODE_INPUT = 'h-10 font-mono tracking-code'

// What a field's control needs to be tied to its label and error.
export type FieldProps = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }

// A labelled control. `aside` holds a limit the user cannot see (a password rule); the error says what to do.
export function Field({ label, aside, error, className, children }: { label: string; aside?: string; error?: string; className?: string; children: (props: FieldProps) => ReactNode }) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children({ id, 'aria-describedby': error ? errorId : undefined, 'aria-invalid': error ? true : undefined })}
      <FieldError id={errorId} className="mt-2">
        {error}
      </FieldError>
    </div>
  )
}

// What is wrong with one field, or one row of a list, written under it.
export function FieldError({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className={cn('text-sm text-destructive', className)} role="alert">
      {children}
    </p>
  )
}

// A message about the whole form rather than one field.
export function FormAlert({ className, children }: { className?: string; children: ReactNode }) {
  if (!children) return null
  return (
    <p className={cn('prose-text border border-destructive px-3 py-2 text-destructive', className)} role="alert">
      {children}
    </p>
  )
}

export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input type={shown ? 'text' : 'password'} className={cn('h-10 pr-14', className)} {...props} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 px-3 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setShown(!shown)}
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

// A form's submit button, filled by default, that shows it is waiting while the form is sent.
export function SubmitButton({ busy, disabled, variant = 'default', ...props }: Omit<ComponentProps<typeof Button>, 'type'> & { busy: boolean }) {
  return <Button type="submit" variant={variant} disabled={busy || disabled} aria-busy={busy} {...props} />
}
