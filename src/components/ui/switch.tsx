import { Switch as Primitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

// On or off, square like everything else. On a touch layout the control is padded out to a 44px target.
export function Switch({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="switch"
      className={cn('group/switch grid h-8 w-11 shrink-0 place-items-center outline-none disabled:opacity-50 max-lg:size-11', className)}
      {...props}
    >
      <span className="flex h-5 w-9 items-center bg-card p-1 inset-ring inset-ring-foreground/45 transition-colors duration-100 group-focus-visible/switch:outline-2 group-focus-visible/switch:outline-offset-1 group-focus-visible/switch:outline-foreground group-data-[state=checked]/switch:bg-foreground group-data-[state=checked]/switch:inset-ring-foreground">
        <Primitive.Thumb className="size-3 bg-foreground/55 transition-transform duration-100 data-[state=checked]:translate-x-4 data-[state=checked]:bg-background" />
      </span>
    </Primitive.Root>
  )
}
