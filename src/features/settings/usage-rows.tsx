import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Project } from '@/api/projects'
import { cn } from '@/lib/utils'
import { FoldChevron } from './parts'
import { ProjectTab } from './project-tabs'

// Every row is a name with its figures, then its chart: side by side on a desktop, stacked on a phone.
export const GRID = 'grid gap-x-6 px-3 md:px-4 lg:grid-cols-[20rem_minmax(0,1fr)]'
// A row's figures sit in the same columns whatever the row: the count, its share, then the chevron.
export const FIGURES = 'flex w-full items-baseline gap-3 text-left'
export const SHARE = 'mono w-10 shrink-0 text-right text-muted-foreground'
export const SLOT = 'flex size-4 shrink-0 items-center self-center'
export const PROJECT_ROW = 'min-h-11 items-center border-t py-2 lg:min-h-9 lg:py-1'

/** A row's figures, then `aside` beside them. With `onToggle` the whole row folds what is under it. */
export function FigureRow({ figures, aside, open = false, onToggle, className }: { figures: ReactNode; aside?: ReactNode; open?: boolean; onToggle?: () => void; className?: string }) {
  return (
    <div className={cn(GRID, className, onToggle && 'cursor-pointer hover:bg-accent')} onClick={onToggle}>
      {onToggle ? (
        // A click on the button reaches the row, which folds; the row is the larger target.
        <button type="button" aria-expanded={open} className={cn(FIGURES, 'cursor-pointer -outline-offset-2')}>
          {figures}
          <span className={SLOT}>
            <FoldChevron open={open} />
          </span>
        </button>
      ) : (
        <p className={FIGURES}>
          {figures}
          <span className={SLOT} />
        </p>
      )}
      {aside}
    </div>
  )
}

/** One project under a row, leading to its settings. */
export function ProjectRow({ org, project, figures, aside }: { org: string; project: Project; figures: ReactNode; aside?: ReactNode }) {
  return (
    <li>
      <Link to="/$org/settings/projects/$project" params={{ org, project: project.slug ?? '' }} search={{ tab: ProjectTab.general }} className={cn(GRID, PROJECT_ROW, 'hover:bg-accent')}>
        <span className={FIGURES}>
          {figures}
          <span className={SLOT}>
            <ChevronRight className="size-4 text-muted-foreground" />
          </span>
        </span>
        {aside}
      </Link>
    </li>
  )
}
