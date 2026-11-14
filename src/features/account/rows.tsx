import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const ROW = 'flex min-h-11 w-full items-center gap-3 border-b py-2 text-left'
const ROW_NAME = 'w-36 shrink-0 text-muted-foreground sm:w-44'

// Names a group of rows. `current` marks the group a link pointed at.
export function Heading({ id, current, action, children }: { id?: string; current?: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <div id={id} className={cn('mt-8 flex min-h-10 scroll-mt-14 items-center justify-between gap-3 border-b first:mt-5', current && 'bg-selected')}>
      <h2 className={cn('label-caps', current && 'font-semibold text-foreground')}>{children}</h2>
      {action}
    </div>
  )
}

// One fact about the account and the one thing that changes it. The whole row is the button; the word at the right says what it does.
export function Fact({ name, value, action, danger, className, ...props }: { name: string; value?: ReactNode; action: string; danger?: boolean } & Omit<ComponentProps<'button'>, 'name' | 'value'>) {
  return (
    // On a phone the value takes its own line, so a long email is never squeezed between the name and the action.
    <button
      type="button"
      className={cn(ROW, 'cursor-pointer transition-colors duration-100 hover:bg-accent max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-y-0 max-sm:py-3', className)}
      {...props}
    >
      <span className={cn(ROW_NAME, 'max-sm:w-auto')}>{name}</span>
      <span className="min-w-0 flex-1 max-sm:order-last max-sm:col-span-2 max-sm:empty:hidden">{value}</span>
      <span className={cn('shrink-0 text-sm font-medium', danger && 'text-destructive')}>{action}</span>
    </button>
  )
}

// A row whose control sits in it, instead of opening something.
export function ControlRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className={cn(ROW, 'justify-between')}>
      <span className={ROW_NAME}>{name}</span>
      {children}
    </div>
  )
}

export function Tag({ warning, children }: { warning?: boolean; children: ReactNode }) {
  return <span className={cn('shrink-0 border px-2 text-xs leading-5', warning && 'border-level-warning text-level-warning')}>{children}</span>
}
