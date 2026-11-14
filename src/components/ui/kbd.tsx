import type * as React from 'react'
import { cn } from '@/lib/utils'

// A key hint. Hidden on touch layouts, where there is no keyboard to press.
export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center border border-current/30 px-1 font-mono text-[0.6875rem] leading-none font-medium opacity-80 max-lg:hidden',
        className,
      )}
      {...props}
    />
  )
}
