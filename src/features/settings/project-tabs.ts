// The `?tab=` values of a project's page: the stock ones, plus the set-up step. `alerts` has no panel yet,
// so its address shows that rather than another tab.
export const ProjectTab = { setup: 'setup', general: 'general', keys: 'dsn', environments: 'environments', alerts: 'alerts' } as const
export type ProjectTab = (typeof ProjectTab)[keyof typeof ProjectTab]

const TABS: string[] = Object.values(ProjectTab)

export const validateProjectSearch = (search: Record<string, unknown>): { tab?: ProjectTab } =>
  typeof search.tab === 'string' && TABS.includes(search.tab) ? { tab: search.tab as ProjectTab } : {}
