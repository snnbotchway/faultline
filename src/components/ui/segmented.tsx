import { cn } from '@/lib/utils'

// A choice among a few fixed values, all visible. The chosen one is filled and heavier, so colour is not the only signal.
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex shrink-0 border', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={disabled}
          onClick={() => option.value !== value && onChange(option.value)}
          className={cn(
            'h-8 border-l px-3 text-sm transition-colors duration-100 first:border-l-0 disabled:opacity-50 max-lg:h-11',
            option.value === value ? 'bg-selected font-semibold' : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
