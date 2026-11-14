import type * as React from 'react'
import { cn } from '@/lib/utils'

// A key hint. Hidden on touch layouts, where there is no keyboard to press, and from screen readers, so it never
// joins the name of the control it sits in; a control that needs its key announced sets `aria-keyshortcuts`.
export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      aria-hidden
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center border border-current/30 px-1 font-mono text-[0.6875rem] leading-none font-medium opacity-80 max-lg:hidden',
        className,
      )}
      {...props}
    />
  )
}
