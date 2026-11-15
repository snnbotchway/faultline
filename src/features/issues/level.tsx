import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { Shape, levelStyle } from './levels'

export function LevelGlyph({ level, className }: { level: string; className?: string }) {
  const { color, shape } = levelStyle(level)
  const names: Record<string, string> = useT().issues.levels
  return (
    <svg viewBox="0 0 10 10" role="img" aria-label={names[level] ?? level} className={cn('size-3 shrink-0', color, className)}>
      {shape === Shape.square && <rect width="10" height="10" fill="currentColor" />}
      {shape === Shape.triangle && <path d="M5 0.5 10 9.5H0Z" fill="currentColor" />}
      {shape === Shape.dot && <circle cx="5" cy="5" r="4.5" fill="currentColor" />}
      {shape === Shape.ring && <circle cx="5" cy="5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.4" />}
    </svg>
  )
}
