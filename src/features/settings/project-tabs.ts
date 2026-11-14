import { alertParam, type AlertParam } from '@/features/alerts/open-rule'

// The `?tab=` values of a project's page: the stock ones, plus the set-up step.
export const ProjectTab = { setup: 'setup', general: 'general', keys: 'dsn', environments: 'environments', alerts: 'alerts' } as const
export type ProjectTab = (typeof ProjectTab)[keyof typeof ProjectTab]

const TABS: string[] = Object.values(ProjectTab)

export type ProjectSearch = { tab?: ProjectTab; alert?: AlertParam }

// `&alert=new` or `&alert=<id>` opens a rule's editor on the Alerts tab, as the stock links do.
export function validateProjectSearch(search: Record<string, unknown>): ProjectSearch {
  if (typeof search.tab !== 'string' || !TABS.includes(search.tab)) return {}
  const tab = search.tab as ProjectTab
  const alert = alertParam(search.alert)
  return tab === ProjectTab.alerts && alert ? { tab, alert } : { tab }
}
