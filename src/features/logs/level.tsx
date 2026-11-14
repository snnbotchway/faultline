import { IssueLevel } from '@/api/issues'
import { LogLevel } from '@/api/logs'
import { LevelGlyph } from '@/features/issues/level'
import { cn } from '@/lib/utils'

// Logs say `warn` where issues say `warning`.
const ISSUE_LEVEL: Partial<Record<LogLevel, IssueLevel>> = { [LogLevel.warn]: IssueLevel.warning }

// A log's level as a shape and a colour, the same shapes as issues. Trace, which issues do not have, is a dash.
export function LogLevelGlyph({ level, className }: { level: LogLevel; className?: string }) {
  if (level === LogLevel.trace)
    return (
      <svg viewBox="0 0 10 10" role="img" aria-label={level} className={cn('size-3 shrink-0 text-level-debug', className)}>
        <rect y="4" width="10" height="2" fill="currentColor" />
      </svg>
    )
  return <LevelGlyph level={ISSUE_LEVEL[level] ?? level} className={className} />
}
