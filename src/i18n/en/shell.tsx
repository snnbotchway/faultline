import type { ReactNode } from 'react'
import { percent } from '../format'

// The frame around every signed-in page: the top bar, the phone's tab bar, the palette, banners and state screens.
export const shell = {
  sections: {
    issues: 'Issues',
    releases: 'Releases',
    uptime: 'Uptime',
    performance: 'Performance',
    logs: 'Logs',
    alerts: 'Alerts',
    settings: 'Settings',
  },
  sectionsNav: 'Sections',
  home: 'Faultline, home',
  organization: 'Organization',
  projects: 'Projects',
  members: 'Members',
  teams: 'Teams',
  settings: 'Settings',
  newOrganization: 'New organization',
  newProject: 'New project',
  environment: 'Environment',
  commands: 'Commands',
  theme: 'Theme',
  themes: { system: 'System', light: 'Light', dark: 'Dark' },
  account: 'Account',
  profile: 'Profile',
  signOut: 'Sign out',
  more: 'More',
  back: 'Back',
  help: 'Help',
  support: 'Support',
  skipToContent: 'Skip to content',
  notBuilt: 'Not built yet',

  supportLinks: {
    faultlineDocs: 'Faultline docs',
    glitchtipDocs: 'GlitchTip docs',
    reportBug: 'Report a Faultline bug',
    glitchtipSupport: 'GlitchTip support',
  },

  palette: {
    placeholder: 'Run a command or search issues',
    command: 'Command',
    searchIssues: (text: string) => `Search issues for “${text}”`,
    switchTo: (name: string) => `Switch to ${name}`,
    theme: (name: string) => `${name} theme`,
    // The palette's group headings, in the order they are listed.
    groups: {
      selection: 'selection',
      issue: 'issue',
      show: 'show',
      goTo: 'go to',
      organization: 'organization',
      theme: 'theme',
      language: 'language',
      account: 'account',
      search: 'search',
    },
  },

  language: {
    label: 'Language',
    browser: 'Same as browser',
    saveFailed: "Couldn't save your language. Pick it again to retry.",
    loadFailed: "Couldn't load that language. Check your connection, then try again.",
  },
  themeSaveFailed: "Couldn't save your theme. Pick it again to retry.",

  banners: {
    verifyEmail: 'Verify your email',
    notVerified: (email: ReactNode) => <>{email} isn't verified.</>,
    sendVerification: 'Send verification email',
    sendVerificationAction: 'send the verification email',
    sentTo: (email: ReactNode) => <>Sent to {email}</>,
    eventsDropped: 'Events dropped',
    notAccepting: 'Not accepting events',
    // `name` is the organization's.
    overPlan: (name: string, state: string) => `${name} is over its plan's event limit and ${state}.`,
    state: (name: string, state: string) => `${name} ${state}.`,
    isntAccepting: "isn't accepting events",
    droppingAll: 'is dropping every new event',
    droppingShare: (rate: number) => `is dropping ${percent(rate)} of new events`,
    ownerCanRaise: "An owner can raise the plan's limit.",
    changeIt: 'Change it',
    askToLift: 'Ask a server admin to lift it.',
    askToTurnOn: 'Ask a server admin to turn them back on.',
  },
}
