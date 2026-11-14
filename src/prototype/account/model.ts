// PROTOTYPE, throwaway. One stubbed account that all three variants read and change, so they differ only in layout and flow.
import { createContext, useContext, useState } from 'react'
import {
  ALERTS,
  EMAILS,
  NEW_TOKEN,
  SECURITY_KEYS,
  SOCIAL_APPS,
  TOKENS,
  USER,
  type AlertChoice,
  type ApiToken,
  type EmailAddress,
  type SecurityKey,
} from './stub'

export const VARIANTS = [
  { key: 'A', name: 'Ledger: one page' },
  { key: 'B', name: 'Tabbed pages' },
  { key: 'C', name: 'Summary and dialogs' },
  { key: 'D', name: 'Mix: summary sheet, /login family' },
] as const
export type VariantKey = (typeof VARIANTS)[number]['key']

export const SCREENS = [
  { key: 'sign-in', label: 'Sign in', signedOut: true },
  { key: 'sign-up', label: 'Sign up', signedOut: true },
  { key: 'sign-up-closed', label: 'Sign up, registration closed', signedOut: true },
  { key: 'provider-signup', label: 'Sign up, provider gave no email', signedOut: true },
  { key: 'reset', label: 'Reset request', signedOut: true },
  { key: 'reset-sent', label: 'Reset request sent', signedOut: true },
  { key: 'reset-limited', label: 'Reset, sent too many times', signedOut: true },
  { key: 'reset-no-email', label: 'Reset, server has no email', signedOut: true },
  { key: 'new-password', label: 'Set new password', signedOut: true },
  { key: 'invite', label: 'Invite, signed out', signedOut: true },
  { key: 'invite-signed-in', label: 'Invite, signed in', signedOut: true },
  { key: 'mfa', label: 'Two-step at sign-in', signedOut: true },
  { key: 'profile', label: 'Profile overview', signedOut: false },
  { key: 'mfa-qr', label: 'Two-step setup: scan', signedOut: false },
  { key: 'mfa-codes', label: 'Two-step setup: recovery codes', signedOut: false },
  { key: 'mfa-on', label: 'Two-step, turned on', signedOut: false },
  { key: 'key-add', label: 'Add security key', signedOut: false },
  { key: 'codes-regen', label: 'New recovery codes', signedOut: false },
  { key: 'notifications', label: 'Notifications', signedOut: false },
  { key: 'tokens', label: 'API tokens', signedOut: false },
  { key: 'tokens-new', label: 'New API token', signedOut: false },
  { key: 'tokens-created', label: 'API token just created', signedOut: false },
] as const
export type ScreenKey = (typeof SCREENS)[number]['key']

// Lets a stubbed form move the prototype on to the screen the real flow would reach.
export const GoContext = createContext<(screen: ScreenKey) => void>(() => {})
export const useGo = () => useContext(GoContext)

// A short task in progress. Each variant decides where it appears: unfolded in place, as its own page, or in a dialog.
export const Flow = {
  totpScan: 'totpScan',
  totpCodes: 'totpCodes',
  key: 'key',
  regen: 'regen',
  tokenNew: 'tokenNew',
  details: 'details',
  emails: 'emails',
  password: 'password',
  linked: 'linked',
  notifications: 'notifications',
} as const
export type Flow = (typeof Flow)[keyof typeof Flow]

export const Section = { account: 'account', mfa: 'mfa', notifications: 'notifications', tokens: 'tokens' } as const
export type Section = (typeof Section)[keyof typeof Section]

// Stock paths, one per section.
export const SECTIONS: { key: Section; label: string; path: string }[] = [
  { key: Section.account, label: 'Account', path: '/profile' },
  { key: Section.mfa, label: 'Two-step verification', path: '/profile/multi-factor-auth' },
  { key: Section.notifications, label: 'Notifications', path: '/profile/notifications' },
  { key: Section.tokens, label: 'API tokens', path: '/profile/auth-tokens' },
]

const START_FLOW: Partial<Record<ScreenKey, Flow>> = {
  'mfa-qr': Flow.totpScan,
  'mfa-codes': Flow.totpCodes,
  'key-add': Flow.key,
  'codes-regen': Flow.regen,
  'tokens-new': Flow.tokenNew,
}

export function sectionOf(screen: ScreenKey): Section {
  if (screen.startsWith('mfa') || screen === 'key-add' || screen === 'codes-regen') return Section.mfa
  if (screen.startsWith('tokens')) return Section.tokens
  if (screen === 'notifications') return Section.notifications
  return Section.account
}

export function useAccount(screen: ScreenKey) {
  const enrolled = screen === 'mfa-on' || screen === 'key-add' || screen === 'codes-regen'
  const [flow, setFlow] = useState<Flow | null>(START_FLOW[screen] ?? null)
  const [section, setSection] = useState<Section>(sectionOf(screen))
  const [name, setName] = useState(USER.name ?? '')
  const [timezone, setTimezone] = useState(USER.options.timezone ?? '')
  const [emails, setEmails] = useState<EmailAddress[]>(EMAILS)
  const [identities, setIdentities] = useState(USER.identities)
  const [totpSince, setTotpSince] = useState<number | null>(enrolled ? 1757926000 : null)
  const [keys, setKeys] = useState<SecurityKey[]>(enrolled ? SECURITY_KEYS : [])
  const [codesLeft, setCodesLeft] = useState<number | null>(enrolled ? 7 : null)
  const [tokens, setTokens] = useState<ApiToken[]>(screen === 'tokens-created' ? [NEW_TOKEN, ...TOKENS] : TOKENS)
  const [created, setCreated] = useState<ApiToken | null>(screen === 'tokens-created' ? NEW_TOKEN : null)
  const [alertDefault, setAlertDefault] = useState(true)
  const [alerts, setAlerts] = useState(ALERTS)
  const now = () => Math.floor(Date.now() / 1000)

  return {
    user: USER,
    socialApps: SOCIAL_APPS,
    emailEnabled: true,
    flow,
    open: (next: Flow) => setFlow(next),
    close: () => setFlow(null),
    section,
    setSection: (next: Section) => {
      setSection(next)
      setFlow(null)
    },
    name,
    setName,
    timezone,
    setTimezone,
    emails,
    addEmail: (email: string) => setEmails((list) => [...list, { email, isPrimary: false, isVerified: false }]),
    makePrimary: (email: string) => setEmails((list) => list.map((e) => ({ ...e, isPrimary: e.email === email }))),
    removeEmail: (email: string) => setEmails((list) => list.filter((e) => e.email !== email)),
    identities,
    disconnect: (uid: string) => setIdentities((list) => list.filter((i) => i.uid !== uid)),
    totpSince,
    keys,
    codesLeft,
    mfaOn: totpSince !== null || keys.length > 0,
    finishTotp: () => {
      setTotpSince(now())
      setCodesLeft(10)
      setFlow(null)
    },
    turnOffTotp: () => setTotpSince(null),
    addKey: (keyName: string) => {
      setKeys((list) => [...list, { type: 'webauthn', id: now(), name: keyName, created_at: now(), last_used_at: null }])
      setCodesLeft((left) => left ?? 10)
      setFlow(null)
    },
    removeKey: (id: number) => setKeys((list) => list.filter((key) => key.id !== id)),
    finishRegen: () => {
      setCodesLeft(10)
      setFlow(null)
    },
    tokens,
    created,
    createToken: (label: string, scopes: string[]) => {
      const token = { ...NEW_TOKEN, id: now(), label, scopes, created: new Date().toISOString() }
      setTokens((list) => [token, ...list])
      setCreated(token)
      setFlow(null)
    },
    dismissCreated: () => setCreated(null),
    revokeToken: (id: number) => {
      setTokens((list) => list.filter((token) => token.id !== id))
      setCreated((token) => (token?.id === id ? null : token))
    },
    alertDefault,
    setAlertDefault,
    alerts,
    setAlert: (projectId: string, choice: AlertChoice) => setAlerts((map) => ({ ...map, [projectId]: choice })),
  }
}
export type Account = ReturnType<typeof useAccount>

// 44px tap targets on touch layouts.
export const TOUCH = 'max-lg:h-11'

const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const day = (time: string | number) => dayFormat.format(new Date(typeof time === 'number' ? time * 1000 : time))
