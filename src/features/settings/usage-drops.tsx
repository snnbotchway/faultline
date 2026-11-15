import { IssueLevel } from '@/api/issues'
import type { Project } from '@/api/projects'
import { LevelGlyph } from '@/features/issues/level'
import { cn } from '@/lib/utils'
import { FigureRow, ProjectRow } from './usage-rows'
import { BLOCKED, dropRange, effectiveDropRate, rangeText } from './usage'

function dropSource(organization: number, project: number): string {
  if (organization > 0 && project > 0) return 'Set for the organization and this project'
  return organization > 0 ? 'Set for the organization' : 'Set for this project'
}

/**
 * The configured share of new events to drop, which is the only limit an instance without billing has. Shown only
 * while something is dropped. Unless the organization drops everything, it unfolds to each project's rate, since a
 * project's rate applies on top of the organization's.
 */
export function DropRows({ org, organization, accepting, projects, open, onToggle }: { org: string; organization: number; accepting: boolean; projects: Project[]; open: boolean; onToggle: () => void }) {
  const range = dropRange(
    organization,
    projects.map((project) => project.eventThrottleRate ?? 0),
  )
  if (range.max === 0) return null
  const foldable = organization < BLOCKED && projects.length > 0
  const unfolded = foldable && open
  return (
    <section aria-label="Events to drop" className={cn('border-b', unfolded && 'bg-card')}>
      <FigureRow
        className="min-h-12 items-center py-2 lg:min-h-11"
        open={unfolded}
        onToggle={foldable ? onToggle : undefined}
        figures={
          <>
            <span className="min-w-0 flex-1 font-medium">Events to drop</span>
            <span className="flex items-baseline gap-2">
              <LevelGlyph level={IssueLevel.warning} className="self-center" />
              <span className="mono font-semibold">{rangeText(range)}</span>
            </span>
          </>
        }
        aside={organization >= BLOCKED && <span className="text-muted-foreground max-lg:mt-1">{accepting ? 'Set for the organization' : 'Not accepting events'}</span>}
      />
      {unfolded && (
        <ul aria-label="Events to drop by project">
          {projects
            .map((project) => ({ project, own: project.eventThrottleRate ?? 0, rate: effectiveDropRate(organization, project.eventThrottleRate ?? 0) }))
            .sort((a, b) => b.rate - a.rate)
            .map(({ project, own, rate }) => (
              <ProjectRow
                key={project.id}
                org={org}
                project={project}
                figures={
                  <>
                    <span className="mono min-w-0 flex-1 [overflow-wrap:anywhere]">{project.slug}</span>
                    <span className={cn('mono', rate === 0 && 'text-muted-foreground')}>{rate}%</span>
                  </>
                }
                aside={rate > 0 && <span className="text-sm text-muted-foreground">{dropSource(organization, own)}</span>}
              />
            ))}
        </ul>
      )}
    </section>
  )
}
