import type { ReactNode } from 'react'
import { plural } from '../format'

// The profile sheet and its dialogs, the setup wizard and email verification.
export const account = {
  profile: 'Profile',
  connectFailed: "That account couldn't be connected. Try again.",
  manage: 'Manage',
  change: 'Change',
  set: 'Set',
  // A password row's value, where `set` is its button.
  isSet: 'Set',
  connect: 'Connect',
  add: 'Add',
  turnOn: 'Turn on',
  turnOff: 'Turn off',

  groups: { account: 'Account', signIn: 'Sign-in', twoStep: 'Two-step verification', notifications: 'Notifications', tokens: 'API tokens' },
  rows: {
    name: 'Name',
    timeZone: 'Time zone',
    emails: 'Emails',
    theme: 'Theme',
    language: 'Language',
    password: 'Password',
    linked: 'Linked accounts',
    app: 'Authenticator app',
    keys: 'Security keys',
    recovery: 'Recovery codes',
    alertEmails: 'Alert emails',
    deleteAccount: 'Delete account',
  },
  notVerified: 'not verified',
  someNotVerified: (count: number) => `${count} not verified`,
  appOnSince: (date: ReactNode) => (
    <>
      On{' '}
      <span className="whitespace-nowrap text-muted-foreground">since {date}</span>
    </>
  ),
  codesLeft: (left: ReactNode, total: ReactNode) => (
    <>
      {left} of {total} left
    </>
  ),
  newCodes: 'New codes',
  projectsChanged: (count: number) => plural(count, { one: '# project changed', other: '# projects changed' }),
  newToken: 'New token',

  turnOffApp: {
    title: 'Turn off the authenticator app?',
    passwordOnly: 'Signing in will then need only your password.',
    action: 'turn off the authenticator app',
  },

  details: {
    title: 'Name and time zone',
    action: 'save your details',
    pickZone: 'Pick a time zone from the list.',
  },

  emails: {
    title: 'Emails',
    primary: 'Primary',
    notVerified: 'Not verified',
    linkSent: 'Link sent',
    sendAgain: 'Send link again',
    makePrimary: 'Make primary',
    add: 'Add an email',
    addButton: 'Add email',
    makePrimaryAction: 'make that your primary email',
    removeAction: 'remove that email',
    sendAction: 'send the link',
    addAction: 'add that email',
  },

  password: {
    current: 'Current password',
    new: 'New password',
    change: 'Change password',
    set: 'Set password',
    setTitle: 'Set a password',
    changed: 'Password changed.',
    setDone: 'Password set.',
    changeAction: 'change your password',
    setAction: 'set your password',
  },

  linked: {
    title: 'Linked accounts',
    disconnectIt: 'Disconnect it',
    disconnect: 'Disconnect',
    connect: (provider: string) => `Connect ${provider}`,
    disconnectAction: (provider: string) => `disconnect ${provider}`,
  },

  delete: {
    title: 'Delete your account?',
    blocked: "Your account can't be deleted yet",
    // `names` is drawn as a list: "acme and globex".
    owned: (names: ReactNode, count: number) => (
      <>
        You own {names}. Transfer {count === 1 ? 'it' : 'them'} to another member, or delete {count === 1 ? 'it' : 'them'}, first.
      </>
    ),
    alone: (names: ReactNode, count: number) => (
      <>
        You're the only member of {names}. Add someone, or delete {count === 1 ? 'it' : 'them'}, first.
      </>
    ),
    cantUndo: "This can't be undone. Your API tokens stop working.",
    action: 'Delete account',
    deleteAction: 'delete your account',
  },

  notifications: {
    title: 'Notifications',
    alertEmails: 'Alert emails',
    default: 'Default',
    forProject: (project: string) => `Alert emails for ${project}`,
    saveAction: 'save that',
    loadAction: 'load your projects',
  },

  tokens: {
    noLabel: 'No label',
    revoke: 'Revoke',
    revokeTitle: (label: string | undefined) => `Revoke ${label || 'this token'}?`,
    revokeToken: 'Revoke token',
    revokeAction: 'revoke that token',
    none: 'No tokens',
    createAction: 'make that token',
    tickOne: 'Tick at least one thing this token may do.',
    label: 'Label',
    mayDo: 'This token may',
    create: 'Create token',
    newTitle: 'New API token',
    copyNow: (label: ReactNode) => <>Copy {label} now</>,
    notShownAgain: "It won't be shown again.",
    copyToken: 'Copy token',
    resources: { project: 'Projects', team: 'Teams', event: 'Events', org: 'Organization', member: 'Members' },
    levels: { read: 'Read', write: 'Write', admin: 'Admin' },
    releases: 'Releases',
  },

  twoStep: {
    turnOnTitle: 'Turn on two-step verification',
    step: (step: number, of: number) => `Step ${step} of ${of}`,
    startAction: 'start setting up the authenticator app',
    checkAction: 'check that code',
    qr: 'QR code for your authenticator app',
    typeKey: 'Or type this key',
    appCode: 'Code from your authenticator app',
    continue: 'Continue',
    saveCodesAction: 'save those codes',
    typeOne: 'Type one of the codes above.',
    newCodesAction: 'make new recovery codes',
    recoveryCodes: 'Recovery codes',
    copyCodes: 'Copy codes',
    download: 'Download',
    confirmSaved: 'Type one of the codes to confirm you saved them',
    confirmCodes: 'Confirm codes',
    newCodesTitle: 'New recovery codes',
    replaceCodes: 'Replace old codes',
    removeKeyAction: 'remove that key',
    added: (date: string) => `added ${date}`,
    used: (date: string) => ` · used ${date}`,
    keyAlreadyAdded: 'That key is already added.',
    keyNotAdded: "The key wasn't added. Try again, and touch the key when your browser asks.",
    addKeyAction: 'add that key',
    keyName: 'Name for a new key',
    waitingForKey: 'Waiting for your security key',
    addKey: 'Add security key',
    keysTitle: 'Security keys',
    noKeys: "This browser can't add a security key. Use a current browser to add one.",
    sendLinkAction: (count: number) => plural(count, { one: 'send the link', other: 'send the links' }),
    verifyFirst: (count: number) => plural(count, { one: 'Verify your email first', other: 'Verify your emails first' }),
    cantSend: (addresses: ReactNode, count: number) => (
      <>
        Two-step verification stays off while {addresses} {count === 1 ? 'is' : 'are'} not verified, and this server can't send email. Ask an administrator to verify{' '}
        {count === 1 ? 'it' : 'them'}, or remove {count === 1 ? 'it' : 'them'} under Emails.
      </>
    ),
    openLinks: (addresses: ReactNode, count: number) => (
      <>
        Open the {count === 1 ? 'link' : 'links'} sent to {addresses}, then turn this on.
      </>
    ),
    sendFirst: (addresses: ReactNode, count: number) => (
      <>
        Two-step verification stays off while {addresses} {count === 1 ? 'is' : 'are'} not verified. Send {count === 1 ? 'a link to verify it' : 'links to verify them'}, or remove{' '}
        {count === 1 ? 'it' : 'them'} under Emails.
      </>
    ),
    sendLinks: (count: number) => plural(count, { one: 'Send link', other: 'Send links' }),
  },

  wizard: {
    title: 'Setup wizard',
    action: 'connect the wizard. Run it again for a new link',
    connected: 'Connected. Go back to your terminal.',
    ask: 'Let the setup wizard in your terminal use your account?',
    connect: 'Connect the wizard',
  },

  confirmEmail: {
    title: 'Verify email',
    verified: 'Email verified.',
    expired: 'This link has expired or was already used',
    sendNew: 'Send a new one from your emails.',
    openProfile: 'Open profile',
    verifying: 'Verifying your email',
  },
}
