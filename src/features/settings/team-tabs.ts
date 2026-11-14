// The stock team paths (`/:org/settings/teams/:team/:tab`). All of them open the team's row in the list.
export const TeamTab = { members: 'members', projects: 'projects', settings: 'settings' } as const
export type TeamTab = (typeof TeamTab)[keyof typeof TeamTab]
