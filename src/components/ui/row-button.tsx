import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// A small action inside a list row. `danger` is for the ones that take something away: delete, remove, disconnect, revoke.
export function RowButton({ danger, className, ...props }: { danger?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn('min-h-8 shrink-0 cursor-pointer text-right text-sm font-medium hover:underline disabled:opacity-50 max-lg:min-h-11 max-lg:min-w-11', danger && 'text-destructive', className)}
      {...props}
    />
  )
}
