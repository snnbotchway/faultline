import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 border text-sm font-medium whitespace-nowrap transition-colors duration-100 select-none disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground hover:bg-primary/85',
        outline: 'bg-card hover:bg-accent aria-expanded:bg-accent',
        ghost: 'border-transparent hover:bg-accent aria-expanded:bg-accent',
        destructive: 'border-destructive bg-card text-destructive hover:bg-destructive hover:text-primary-foreground',
        link: 'h-auto border-transparent px-0 text-brand underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-7 px-2.5',
        default: 'h-8 px-3',
        lg: 'h-9 px-4',
        touch: 'h-11 px-4',
        icon: 'size-8',
        'icon-sm': 'size-7',
        'icon-touch': 'size-11',
      },
    },
    defaultVariants: { variant: 'outline', size: 'default' },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="button" type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button }
