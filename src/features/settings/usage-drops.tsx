import { IssueLevel } from '@/api/issues'
import type { Project } from '@/api/projects'
import { LevelGlyph } from '@/features/issues/level'
import { messages, percent, useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { FigureRow, ProjectRow } from './usage-rows'
import { BLOCKED, dropRange, effectiveDropRate, rangeText } from './usage'

function dropSource(organization: number, project: number): string {
  const text = messages().settings.usagePage
  if (organization > 0 && project > 0) return text.setForBoth
  return organization > 0 ? text.setForOrganization : text.setForProject
}

/**
 * The configured share of new events to drop, which is the only limit an instance without billing has. Shown only
 * while something is dropped. Unless the organization drops everything, it unfolds to each project's rate, since a
 * project's rate applies on top of the organization's.
 */
export function DropRows({ org, organization, accepting, projects, open, onToggle }: { org: string; organization: number; accepting: boolean; projects: Project[]; open: boolean; onToggle: () => void }) {
  const t = useT().settings.usagePage
  const range = dropRange(
    organization,
    projects.map((project) => project.eventThrottleRate ?? 0),
  )
  if (range.max === 0) return null
  const foldable = organization < BLOCKED && projects.length > 0
  const unfolded = foldable && open
  return (
    <section aria-label={t.eventsToDrop} className={cn('border-b', unfolded && 'bg-card')}>
      <FigureRow
        className="min-h-12 items-center py-2 lg:min-h-11"
        open={unfolded}
        onToggle={foldable ? onToggle : undefined}
        figures={
          <>
            <span className="min-w-0 flex-1 font-medium">{t.eventsToDrop}</span>
            <span className="flex items-baseline gap-2">
              <LevelGlyph level={IssueLevel.warning} className="self-center" />
              <span className="mono font-semibold">{rangeText(range)}</span>
            </span>
          </>
        }
        aside={organization >= BLOCKED && <span className="text-muted-foreground max-lg:mt-1">{accepting ? t.setForOrganization : t.notAccepting}</span>}
      />
      {unfolded && (
        <ul aria-label={t.eventsToDropByProject}>
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
                    <span className={cn('mono', rate === 0 && 'text-muted-foreground')}>{percent(rate)}</span>
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
