import { cn } from '@/lib/utils'

// One stratum line, slipped along a fault.
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 text-brand', className)} fill="none" aria-hidden>
      <path d="M2 8h8l4 8h8" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Mark />
      <span className="font-mono text-xs font-semibold tracking-wordmark">FAULTLINE</span>
    </span>
  )
}
