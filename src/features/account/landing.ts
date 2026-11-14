// Where a stock path lands on the sheet: a section to point at, or a dialog to open.
export const Landing = { top: 'top', twoStep: 'twoStep', notifications: 'notifications', tokens: 'tokens', newToken: 'newToken' } as const
export type Landing = (typeof Landing)[keyof typeof Landing]

export const LANDING_PATHS = {
  [Landing.top]: '/profile',
  [Landing.twoStep]: '/profile/multi-factor-auth',
  [Landing.notifications]: '/profile/notifications',
  [Landing.tokens]: '/profile/auth-tokens',
  [Landing.newToken]: '/profile/auth-tokens/new',
} as const
