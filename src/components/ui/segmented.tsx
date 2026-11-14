import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

// A choice among a few fixed values, all visible. The chosen one is filled and heavier, so colour is not the only signal;
// `sm` sits in a section heading beside a period toggle and looks like it, the chosen one inverted.
// Like any radio group it is one Tab stop; the arrow keys move the choice.
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
  size = 'default',
  className,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
  size?: 'default' | 'sm'
  className?: string
}) {
  const current = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  function move(event: KeyboardEvent<HTMLDivElement>) {
    const last = options.length - 1
    const to = event.key === 'Home' ? 0 : event.key === 'End' ? last : event.key in STEP ? (current + STEP[event.key]! + options.length) % options.length : undefined
    if (to === undefined || disabled) return
    event.preventDefault()
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons[to]?.focus()
    if (to !== current) onChange(options[to]!.value)
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={move} className={cn('inline-flex shrink-0 border', className)}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={index === current ? 0 : -1}
          disabled={disabled}
          onClick={() => option.value !== value && onChange(option.value)}
          className={cn(
            'border-l text-sm transition-colors duration-100 first:border-l-0 disabled:opacity-50 max-lg:h-11',
            size === 'sm' ? 'h-6 px-2 max-lg:px-3' : 'h-8 px-3',
            option.value === value
              ? size === 'sm'
                ? 'bg-foreground text-background'
                : 'bg-selected font-semibold'
              : cn('text-muted-foreground hover:text-foreground', size === 'default' && 'bg-card hover:bg-accent'),
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
