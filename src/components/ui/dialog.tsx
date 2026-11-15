import { Dialog as Primitive } from 'radix-ui'
import { useCallback, useRef } from 'react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export const Dialog = Primitive.Root
export const DialogTrigger = Primitive.Trigger
export const DialogClose = Primitive.Close

// Radix gives focus back to a Dialog.Trigger, but most dialogs here open from state or from a menu item, and a field
// with `autoFocus` has taken focus before Radix looks. So the last few focused controls are kept, and the dialog
// takes the latest one outside itself as its opener. Focus in a menu or popover counts as focus on the button that
// opened it, as the menu is gone by the time the dialog closes.
const recent: HTMLElement[] = []
const REMEMBERED = 10
const FLOATING = '[data-radix-popper-content-wrapper]'

function control(element: HTMLElement): HTMLElement | undefined {
  const floating = element.closest(FLOATING)?.firstElementChild
  if (!floating) return element
  const trigger = floating.id ? document.querySelector(`[aria-controls="${CSS.escape(floating.id)}"]`) : null
  return trigger instanceof HTMLElement ? control(trigger) : undefined
}

if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const focused = event.target instanceof HTMLElement ? control(event.target) : undefined
      if (!focused || focused === recent[0]) return
      const seen = recent.indexOf(focused)
      if (seen !== -1) recent.splice(seen, 1)
      recent.unshift(focused)
      recent.length = Math.min(recent.length, REMEMBERED)
    },
    true,
  )
}

export function DialogContent({ className, children, onCloseAutoFocus, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  const opener = useRef<HTMLElement | undefined>(undefined)
  const remember = useCallback((node: HTMLDivElement | null) => {
    if (node) opener.current = recent.find((element) => element.isConnected && !node.contains(element))
  }, [])
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-150" />
      <Primitive.Content
        ref={remember}
        className={cn(
          'fixed top-[14vh] left-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 border bg-popover text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-150',
          className,
        )}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          const target = opener.current
          if (event.defaultPrevented || !target?.isConnected) return
          event.preventDefault()
          // A dialog opened from this one (the palette's choice) already holds focus; leave it there.
          const active = document.activeElement
          if (active && active !== document.body && active.isConnected) return
          target.focus()
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
