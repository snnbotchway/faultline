// The tabs of a project's page. The values are the stock `?tab=` values, plus the set-up step.
export const ProjectTab = { setup: 'setup', general: 'general', keys: 'dsn', environments: 'environments' } as const
export type ProjectTab = (typeof ProjectTab)[keyof typeof ProjectTab]

const TABS: string[] = Object.values(ProjectTab)

// Anything else, such as the stock `alerts` tab that has no screen here yet, falls back to the page's own choice.
export const validateProjectSearch = (search: Record<string, unknown>): { tab?: ProjectTab } =>
  typeof search.tab === 'string' && TABS.includes(search.tab) ? { tab: search.tab as ProjectTab } : {}
