import { X } from 'lucide-react'
import { Dialog as Primitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export const Dialog = Primitive.Root
export const DialogTrigger = Primitive.Trigger
export const DialogClose = Primitive.Close

// `tall` is for a dialog that holds a whole form: a bar, a body that scrolls, and a footer.
export function DialogContent({ className, children, tall = false, ...props }: React.ComponentProps<typeof Primitive.Content> & { tall?: boolean }) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-150" />
      <Primitive.Content
        className={cn(
          'fixed top-[14vh] left-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 border bg-popover text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-150',
          tall && 'dialog-tall flex flex-col',
          className,
        )}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  )
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn('text-lg font-semibold', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn('prose-text text-muted-foreground', className)} {...props} />
}

// A dialog's title bar, with the close button.
export function DialogBar({ title }: { title: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b pr-2 pl-4">
      <DialogTitle className="truncate text-base">{title}</DialogTitle>
      <Primitive.Close aria-label="Close" title="Close" className="grid size-8 shrink-0 cursor-pointer place-items-center hover:bg-accent max-lg:size-11">
        <X className="size-4" />
      </Primitive.Close>
    </div>
  )
}
