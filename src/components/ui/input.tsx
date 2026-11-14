import type * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 border bg-card px-2.5 text-base outline-none transition-colors duration-100 placeholder:text-muted-foreground focus-visible:border-brand focus-visible:outline-none disabled:opacity-50 aria-invalid:border-destructive max-lg:h-11 max-lg:text-[1rem]',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'prose-text block w-full resize-y border bg-card px-3 py-2 outline-none transition-colors duration-100 placeholder:text-muted-foreground focus-visible:border-brand focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}
