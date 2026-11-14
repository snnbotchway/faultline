// PROTOTYPE, throwaway. Stubbed data in the backend's own shapes, so the screens are honest about what they will get.
import type { components as AllauthComponents } from '@/api/schema/allauth'
import type { components } from '@/api/schema/openapi'

type Schemas = components['schemas']
type Allauth = AllauthComponents['schemas']

export type User = Schemas['UserDetailSchema']
export type EmailAddress = Schemas['EmailAddressSchema']
export type Identity = Schemas['SocialAccountSchema']
export type SocialApp = Schemas['SocialAppSchema']
export type ApiToken = Schemas['APITokenSchema']
// A key that has never been used has no last-used time.
export type SecurityKey = Omit<Allauth['WebAuthnAuthenticator'], 'last_used_at'> & { last_used_at: number | null }
export type RecoveryCodes = Allauth['RecoveryCodesAuthenticator']
export type MfaType = Allauth['AuthenticatorType']
export type Invite = {
  acceptInvite: boolean
  orgUser: Pick<Schemas['OrganizationUserOrganizationSchema'], 'email' | 'role' | 'roleName'> & {
    organization: Pick<Schemas['OrganizationSchema'], 'name' | 'slug'>
  }
}

export const SOCIAL_APPS: SocialApp[] = [
  { name: 'GitLab', provider: 'gitlab', brand: 'gitlab', client_id: 'stub', scopes: [] },
  { name: 'Company SSO', provider: 'company-oidc', brand: 'openid_connect', client_id: 'stub', scopes: [] },
]

export const USER: User = {
  id: '1',
  username: 'demo@example.com',
  email: 'demo@example.com',
  name: 'Ama Owusu',
  dateJoined: '2026-03-02T09:14:00Z',
  lastLogin: '2026-11-14T08:02:00Z',
  hasPasswordAuth: true,
  isSuperuser: false,
  isActive: true,
  options: { timezone: 'Africa/Accra', preferredTheme: null },
  identities: [
    { id: 7, provider: 'gitlab', uid: '4411', email: 'ama@gitlab.example', username: 'ama', lastLogin: '2026-11-02T10:00:00Z', dateJoined: '2026-03-02T09:20:00Z' },
  ],
}

export const EMAILS: EmailAddress[] = [
  { email: 'demo@example.com', isPrimary: true, isVerified: true },
  { email: 'ama.owusu@work.example', isPrimary: false, isVerified: false },
]

export const SECURITY_KEYS: SecurityKey[] = [
  { type: 'webauthn', id: 3, name: 'YubiKey 5C', created_at: 1757930000, last_used_at: 1762900000, is_passwordless: false },
]

// GET /api/0/generate-recovery-codes/ previews ten 8-digit codes.
export const RECOVERY_PREVIEW = ['48201937', '90317462', '15570284', '66093815', '27749103', '83164590', '50928371', '71430268', '39685012', '04817756']

export const TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'

// Made up at run time, so no token-shaped literal sits in the repository.
function fakeToken(seed: number) {
  let value = ''
  for (let state = seed; value.length < 64; ) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    value += (state >> 8).toString(16).padStart(6, '0').slice(-6)
  }
  return value.slice(0, 64)
}

export const NEW_TOKEN: ApiToken = {
  id: 12,
  label: 'release script',
  scopes: ['project:read', 'project:releases', 'org:read'],
  token: fakeToken(7),
  created: '2026-11-14T13:05:00Z',
}

export const TOKENS: ApiToken[] = [
  { id: 9, label: 'ci deploys', scopes: ['project:read', 'project:write', 'project:releases'], token: fakeToken(14), created: '2026-08-21T16:40:00Z' },
  { id: 4, label: 'grafana', scopes: ['org:read', 'project:read', 'event:read', 'team:read', 'member:read'], token: fakeToken(21), created: '2026-04-03T11:12:00Z' },
]

export const SCOPE_RESOURCES = [
  { key: 'project', label: 'Projects' },
  { key: 'team', label: 'Teams' },
  { key: 'event', label: 'Events' },
  { key: 'org', label: 'Organization' },
  { key: 'member', label: 'Members' },
] as const
export const SCOPE_LEVELS = ['read', 'write', 'admin'] as const
export const RELEASES_SCOPE = 'project:releases'

// GET /api/0/projects/ (trimmed) and GET /users/me/notifications/alerts/: -1 default, 0 off, 1 on.
export type AlertChoice = -1 | 0 | 1
export const PROJECTS = [
  { id: '1', slug: 'web-app', org: 'demo-co' },
  { id: '2', slug: 'api', org: 'demo-co' },
  { id: '3', slug: 'billing-worker', org: 'demo-co' },
  { id: '4', slug: 'mobile-ios', org: 'demo-co' },
  { id: '9', slug: 'blog', org: 'side-projects' },
]
export const ALERTS: Record<string, AlertChoice> = { '2': 0, '3': 1 }

export const INVITE: Invite = {
  acceptInvite: false,
  orgUser: { email: 'kofi@example.com', role: 'member', roleName: 'Member', organization: { name: 'Demo Co', slug: 'demo-co' } },
}

export const MFA_TYPES: MfaType[] = ['totp', 'recovery_codes', 'webauthn']
