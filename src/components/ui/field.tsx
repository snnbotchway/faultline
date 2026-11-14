import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'

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
      {error && (
        <p id={errorId} className="prose-text mt-2 text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
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
