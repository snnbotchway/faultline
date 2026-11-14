import { Check } from 'lucide-react'
import { DropdownMenu as Primitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export const DropdownMenu = Primitive.Root
export const DropdownMenuTrigger = Primitive.Trigger
export const DropdownMenuGroup = Primitive.Group
export const DropdownMenuRadioGroup = Primitive.RadioGroup

const ITEM =
  'relative flex min-h-8 cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent max-lg:min-h-11 [&_svg]:size-4 [&_svg]:shrink-0'

export function DropdownMenuContent({ className, sideOffset = 4, align = 'start', ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-44 overflow-y-auto border bg-popover py-1 text-popover-foreground shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-100',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  )
}

export function DropdownMenuItem({ className, destructive, ...props }: React.ComponentProps<typeof Primitive.Item> & { destructive?: boolean }) {
  return <Primitive.Item className={cn(ITEM, destructive && 'text-destructive', className)} {...props} />
}

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem className={cn(ITEM, 'pr-8', className)} {...props}>
      {children}
      <Primitive.ItemIndicator className="absolute right-2.5">
        <Check />
      </Primitive.ItemIndicator>
    </Primitive.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn('label-caps px-2.5 pt-2 pb-1', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator className={cn('my-1 h-px bg-border', className)} {...props} />
}
