import type { ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'

// The page bar of a list screen: its title, then its search and controls. On a phone the search
// drops to a line of its own under the title.
export function ListPageBar({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageBar className="max-lg:h-auto max-lg:flex-wrap max-lg:gap-y-0 max-lg:pb-2">
      <h1 className="shrink-0 font-semibold max-lg:flex max-lg:h-11 max-lg:items-center">{title}</h1>
      {children}
    </PageBar>
  )
}
