import { Popover as Primitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export const Popover = Primitive.Root
export const PopoverTrigger = Primitive.Trigger

export function PopoverContent({ className, sideOffset = 4, align = 'start', ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 w-72 border bg-popover p-3 text-popover-foreground shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-100',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  )
}
