import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { canWriteProjects, organizationQuery, projectsQuery } from '@/api/organizations'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { AlertRules } from '@/features/alerts/alert-rules'
import { RuleEditor, type OpenRule } from '@/features/alerts/open-rule'
import { useTitle } from '@/lib/title'

type AlertsSearch = { alertProject?: string; alert?: string }

// `?alertProject=&alert=<id>|new` opens a rule's editor over the list; the list itself always shows every project.
const validateSearch = (search: Record<string, unknown>): AlertsSearch =>
  typeof search.alertProject === 'string' && (typeof search.alert === 'string' || typeof search.alert === 'number') ? { alertProject: search.alertProject, alert: String(search.alert) } : {}

export const Route = createFileRoute('/_app/$org/alerts')({ validateSearch, component: AlertsRoute })

function AlertsRoute() {
  const { org } = Route.useParams()
  const { alertProject, alert } = Route.useSearch()
  const navigate = useNavigate()
  const canWrite = canWriteProjects(useQuery(organizationQuery(org)).data?.access)
  const first = useQuery(projectsQuery(org)).data?.[0]?.slug
  const openRule = (rule?: OpenRule) => void navigate({ to: '/$org/alerts', params: { org }, search: rule ? { alertProject: rule.project, alert: rule.alert } : {} })
  useTitle('Alerts')
  return (
    <>
      <PageBar>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        {canWrite && first && (
          <Button variant="default" size="bar" className="ml-auto" onClick={() => openRule({ alert: RuleEditor.new, project: first })}>
            New rule
          </Button>
        )}
      </PageBar>
      <AlertRules org={org} open={alertProject && alert ? { project: alertProject, alert } : undefined} onOpen={openRule} />
    </>
  )
}
