import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// A small boxed word beside a name: a role, a state, a kind. `ok` is for a state that is good news.
export function Tag({ children, ok }: { children: ReactNode; ok?: boolean }) {
  return <span className={cn('mono shrink-0 border px-1 text-xs whitespace-nowrap', ok ? 'text-ok' : 'text-muted-foreground')}>{children}</span>
}
