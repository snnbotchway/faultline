import { Check, Minus } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

// The visible box is 16px; `hit` pads the control out to a 44px touch target.
export function Checkbox({ className, hit, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root> & { hit?: boolean }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn('group/checkbox grid shrink-0 place-items-center outline-none', hit ? 'size-11 lg:size-8' : 'size-4', className)}
      {...props}
    >
      <span className="grid size-4 place-items-center border border-foreground/45 transition-colors duration-100 group-hover/checkbox:border-foreground group-focus-visible/checkbox:outline-2 group-focus-visible/checkbox:outline-offset-1 group-focus-visible/checkbox:outline-foreground group-data-[state=checked]/checkbox:border-brand group-data-[state=checked]/checkbox:bg-brand group-data-[state=checked]/checkbox:text-brand-foreground group-data-[state=indeterminate]/checkbox:border-brand group-data-[state=indeterminate]/checkbox:bg-brand group-data-[state=indeterminate]/checkbox:text-brand-foreground">
        <CheckboxPrimitive.Indicator>
          {props.checked === 'indeterminate' ? <Minus className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  )
}
