import type { ReactNode } from 'react'

// The look of the link back to the section, as the crumbs' `root`.
export const CRUMB_LINK = 'shrink-0 text-muted-foreground hover:text-foreground max-lg:py-3'

// "Uptime / Checkout API": where a page sits under its section.
// With nothing to name yet (still loading, or failed), only the section shows.
export function Crumbs({ root, children }: { root: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
      {root}
      {children && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="truncate">{children}</span>
        </>
      )}
    </div>
  )
}
