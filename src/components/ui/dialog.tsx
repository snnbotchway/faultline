import { Dialog as Primitive } from 'radix-ui'
import { useRef } from 'react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export const Dialog = Primitive.Root
export const DialogTrigger = Primitive.Trigger
export const DialogClose = Primitive.Close

export function DialogContent({ className, children, onOpenAutoFocus, onCloseAutoFocus, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  // Radix gives focus back to a Dialog.Trigger, and most dialogs here open from state, so this remembers what had
  // focus instead. A menu item that opened one is gone by then, and Radix's own fallback stands.
  const opener = useRef<Element | null>(null)
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-150" />
      <Primitive.Content
        className={cn(
          'fixed top-[14vh] left-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 border bg-popover text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-150',
          className,
        )}
        onOpenAutoFocus={(event) => {
          opener.current = document.activeElement
          onOpenAutoFocus?.(event)
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (event.defaultPrevented || !(opener.current instanceof HTMLElement) || !opener.current.isConnected) return
          event.preventDefault()
          opener.current.focus()
        }}
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
