import { useQueries, useQuery } from '@tanstack/react-query'
import { projectAlertsQuery, type Alert } from '@/api/alerts'
import { canAdminProjects, canWriteProjects, organizationQuery, projectsQuery } from '@/api/organizations'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { RowButton } from '@/components/ui/row-button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AlertDialog } from './alert-dialog'
import { useT } from '@/i18n'
import { conditions } from './conditions'
import { RuleEditor, type OpenRule } from './open-rule'
import { RecipientChip } from './recipients'

// The last column holds the row's action word.
const COLUMNS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,3fr)_48px]'

/**
 * The alert rules of every project, or of one (`project`), and the editor for the one that is open.
 * The caller owns the address: `onOpen` is told which rule to open, or nothing to close the editor.
 */
export function AlertRules({ org, project, open, onOpen }: { org: string; project?: string; open?: OpenRule; onOpen: (rule?: OpenRule) => void }) {
  const { alerts: t, common } = useT()
  const projects = useQuery(projectsQuery(org))
  const access = useQuery(organizationQuery(org)).data?.access
  const canWrite = canWriteProjects(access)
  const slugs = project ? [project] : (projects.data?.flatMap((item) => (item.slug ? [item.slug] : [])) ?? [])
  const rules = useQueries({ queries: slugs.map((slug) => projectAlertsQuery(org, slug)) })
  const editing = open && open.alert !== RuleEditor.new ? rules[slugs.indexOf(open.project)]?.data?.find((rule) => rule.id === open.alert) : undefined

  if (!project && projects.isError)
    return (
      <Screen title={t.rulesFailed}>
        <Button onClick={() => void projects.refetch()}>{common.tryAgain}</Button>
      </Screen>
    )
  if (!project && projects.isSuccess && slugs.length === 0) return <Screen title={t.needsProject} />

  return (
    <>
      <div className={cn('grid h-8 items-center gap-x-4 border-b px-4 max-lg:hidden', COLUMNS)}>
        <span className="label-caps">{t.columns.rule}</span>
        <span className="label-caps">{t.columns.when}</span>
        <span className="label-caps">{t.columns.environments}</span>
        <span className="label-caps">{t.columns.notifies}</span>
        <span />
      </div>
      {!project && projects.isPending && <RuleSkeleton />}
      {slugs.map((slug, index) => {
        const query = rules[index]!
        return (
          <section key={slug} aria-label={slug}>
            {!project && (
              <h2 className="mono flex h-8 items-center gap-2 border-b bg-muted/60 px-3 font-semibold lg:px-4">
                {slug}
                <span className="font-normal text-muted-foreground">{query.data?.length}</span>
              </h2>
            )}
            {query.isPending ? (
              <RuleSkeleton rows={2} />
            ) : query.isError ? (
              <p className="flex min-h-11 items-center gap-3 border-b px-3 text-muted-foreground lg:px-4">
                {t.rowsFailed}
                <RowButton onClick={() => void query.refetch()}>{common.tryAgain}</RowButton>
              </p>
            ) : query.data.length === 0 ? (
              <p className="flex min-h-11 items-center gap-3 border-b px-3 text-muted-foreground lg:px-4">
                {t.noRules}
                {canWrite && <RowButton onClick={() => onOpen({ alert: RuleEditor.new, project: slug })}>{t.addRule}</RowButton>}
              </p>
            ) : (
              <ul>
                {query.data.map((rule) => (
                  <li key={rule.id} className="border-b">
                    <RuleRow rule={rule} onOpen={canWrite ? () => onOpen({ alert: rule.id!, project: slug }) : undefined} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      {open && canWrite && (open.alert === RuleEditor.new || editing) && (
        <AlertDialog key={`${open.project}:${open.alert}`} org={org} project={open.project} rule={editing} projects={project ? undefined : slugs} canDelete={canAdminProjects(access)} onClose={() => onOpen()} />
      )}
    </>
  )
}

// The whole row opens the rule; "Edit" names what that does (DESIGN.md, Rows).
function RuleRow({ rule, onOpen }: { rule: Alert; onOpen?: () => void }) {
  const { alerts: t, common } = useT()
  const when = t.either(conditions(rule))
  const cells = (
    <>
      <span className="truncate font-medium">{rule.name || when}</span>
      <span className="truncate">{when}</span>
      <span className={cn('truncate text-muted-foreground', rule.environments.length > 0 && 'mono')}>{rule.environments.join(', ') || common.allEnvironments}</span>
      <span className="flex flex-wrap gap-x-3 gap-y-1">
        {rule.alertRecipients.length === 0 && <span className="text-sm text-muted-foreground">{t.nobody}</span>}
        {rule.alertRecipients.map((recipient) => (
          <RecipientChip key={recipient.id ?? `${recipient.recipientType}${recipient.url}`} recipient={recipient} />
        ))}
      </span>
      {onOpen && (
        <span aria-hidden className="text-right text-sm font-medium group-hover:underline max-lg:hidden">
          {common.edit}
        </span>
      )}
    </>
  )
  const layout = cn('grid w-full grid-cols-1 items-center gap-x-4 gap-y-1 px-3 py-3 text-left lg:min-h-11 lg:px-4 lg:py-2', COLUMNS)
  return onOpen ? (
    <button type="button" onClick={onOpen} className={cn(layout, 'group cursor-pointer transition-colors duration-100 hover:bg-accent/60')}>
      {cells}
    </button>
  ) : (
    <div className={layout}>{cells}</div>
  )
}

function RuleSkeleton({ rows = 3 }: { rows?: number }) {
  const t = useT().alerts
  return (
    <div aria-busy aria-label={t.loading}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cn('grid gap-x-4 gap-y-2 border-b px-3 py-3 lg:px-4', COLUMNS)}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-12 max-lg:hidden" />
          <Skeleton className="h-4 w-36" />
        </div>
      ))}
    </div>
  )
}
