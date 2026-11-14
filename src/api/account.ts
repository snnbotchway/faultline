import { queryOptions } from '@tanstack/react-query'
import { MfaType } from './auth'
import { ApiError, allauthAccount, api, orgPath, unwrap } from './client'
import { MAX_PAGE_SIZE, fetchAllPages } from './pagination'
import type { components as AllauthComponents } from './schema/allauth'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
type Allauth = AllauthComponents['schemas']

export type CurrentUser = Schemas['UserDetailSchema']
export type EmailAddress = Schemas['EmailAddressSchema']
export type LinkedAccount = Schemas['SocialAccountSchema']
export type ApiToken = Schemas['APITokenSchema']
export type Invite = Schemas['AcceptInviteSchema']
export type SecurityKey = Allauth['WebAuthnAuthenticator']
export type RecoveryCodes = Allauth['RecoveryCodesAuthenticator']
export type TotpSetup = { secret: string; totp_url: string }
export type NotificationProject = Schemas['ProjectOrganizationSchema']

const ME = { user_id: 'me' } as const
const me = { params: { path: ME } }

export const accountKeys = {
  user: ['users', 'me'] as const,
  emails: ['users', 'me', 'emails'] as const,
  authenticators: ['users', 'me', 'authenticators'] as const,
  totpSetup: ['users', 'me', 'totp-setup'] as const,
  notifications: ['users', 'me', 'notifications'] as const,
  alerts: ['users', 'me', 'alerts'] as const,
  tokens: ['users', 'me', 'api-tokens'] as const,
  projects: ['users', 'me', 'projects'] as const,
  // Outside the user's keys on purpose: every read makes a new set, so nothing may refresh it while it is shown.
  recoveryPreview: ['recovery-codes-preview'] as const,
  deleteBlockers: ['users', 'me', 'delete-blockers'] as const,
  invite: (memberId: string, token: string) => ['invite', memberId, token] as const,
}

/* ---------- Details, emails, password, linked accounts ---------- */

export const emailsQuery = queryOptions({
  queryKey: accountKeys.emails,
  queryFn: async () => unwrap(await api.GET('/api/0/users/{user_id}/emails/', me)),
  // The shell's banner follows verification done in another tab or on the phone.
  refetchInterval: 5 * 60_000,
})

// What stops the account being deleted. The backend refuses an owner of any organization, and anyone whose
// leaving would empty an organization (pending invitations count as members). Names, by organization.
export type DeleteBlockers = { owned: string[]; alone: string[] }

export const deleteBlockersQuery = (userId: string) =>
  queryOptions({
    queryKey: accountKeys.deleteBlockers,
    queryFn: async (): Promise<DeleteBlockers> => {
      const organizations = await fetchAllPages((cursor) => api.GET('/api/0/organizations/', { params: { query: { cursor, limit: MAX_PAGE_SIZE } } }))
      const memberships = await Promise.all(
        organizations.map(async (organization) => ({
          name: organization.name,
          members: await fetchAllPages((cursor) =>
            api.GET('/api/0/organizations/{organization_id_or_slug}/members/', { params: { path: orgPath(organization.slug), query: { cursor, limit: MAX_PAGE_SIZE } } }),
          ),
        })),
      )
      return {
        owned: memberships.filter(({ members }) => members.some((member) => member.isOwner && member.user?.id === userId)).map(({ name }) => name),
        alone: memberships.filter(({ members }) => members.length === 1).map(({ name }) => name),
      }
    },
    staleTime: 0,
  })

export const account = {
  update: async (body: Schemas['UserIn']) => unwrap(await api.PUT('/api/0/users/{user_id}/', { ...me, body })),
  // The backend refuses while the user still owns an organization.
  delete: async () => {
    unwrap(await api.DELETE('/api/0/users/{user_id}/', me))
  },

  addEmail: async (email: string) => unwrap(await api.POST('/api/0/users/{user_id}/emails/', { ...me, body: { email } })),
  removeEmail: async (email: string) => {
    unwrap(await api.DELETE('/api/0/users/{user_id}/emails/', { ...me, body: { email } }))
  },
  makePrimary: async (email: string) => unwrap(await api.PUT('/api/0/users/{user_id}/emails/', { ...me, body: { email } })),
  sendVerification: async (email: string) => {
    unwrap(await api.POST('/api/0/users/{user_id}/emails/confirm/', { ...me, body: { email } }))
  },

  // Leave `current` out for an account that only signs in through a provider and has no password yet.
  changePassword: async ({ current, next }: { current?: string; next: string }) => {
    unwrap(await allauthAccount.POST('/_allauth/browser/v1/account/password/change', { body: { current_password: current, new_password: next } }))
  },

  disconnect: async (linked: Pick<LinkedAccount, 'provider' | 'uid'>) => {
    unwrap(await allauthAccount.DELETE('/_allauth/browser/v1/account/providers', { body: { provider: linked.provider, account: linked.uid } }))
  },
}

/* ---------- Two-step verification ---------- */

type Authenticator = Allauth['AuthenticatorList'][number]

export type TwoStep = {
  totp?: Allauth['TOTPAuthenticator']
  keys: SecurityKey[]
  recovery?: RecoveryCodes
}

export function toTwoStep(list: Authenticator[]): TwoStep {
  return {
    totp: list.find((item) => item.type === MfaType.totp),
    keys: list.filter((item) => item.type === MfaType.webauthn),
    recovery: list.find((item) => item.type === MfaType.recoveryCodes),
  }
}

export const twoStepQuery = queryOptions({
  queryKey: accountKeys.authenticators,
  queryFn: async () => toTwoStep(unwrap(await allauthAccount.GET('/_allauth/browser/v1/account/authenticators')).data),
})

// The backend answers "not found" for an account without an authenticator app, and that answer carries the new secret.
const NOT_SET_UP = 404

export const totpSetupQuery = queryOptions({
  queryKey: accountKeys.totpSetup,
  queryFn: async (): Promise<TotpSetup> => {
    const { error, response } = await allauthAccount.GET('/_allauth/browser/v1/account/authenticators/totp')
    const meta = error && 'meta' in error ? (error.meta as TotpSetup | undefined) : undefined
    if (response.status === NOT_SET_UP && meta) return meta
    throw new ApiError(response.status, error)
  },
  // A secret is for one attempt at setting up; never reuse a cached one.
  staleTime: 0,
  gcTime: 0,
  retry: false,
})

export const twoStep = {
  activateTotp: async (code: string) => {
    unwrap(await allauthAccount.POST('/_allauth/browser/v1/account/authenticators/totp', { body: { code } }))
  },
  deactivateTotp: async () => {
    unwrap(await allauthAccount.DELETE('/_allauth/browser/v1/account/authenticators/totp'))
  },

  // Makes the previewed codes the active ones, given one of them back.
  confirmRecoveryCodes: async (code: string) => {
    unwrap(await api.POST('/api/0/generate-recovery-codes/', { body: { code } }))
  },

  // Pass the options to navigator.credentials.create(), then send back the credential's toJSON().
  securityKeyOptions: async () => unwrap(await allauthAccount.GET('/_allauth/browser/v1/account/authenticators/webauthn')).data.creation_options as unknown,
  // allauth's schema types the credential as an empty object; it is the browser's PublicKeyCredential JSON.
  addSecurityKey: async (name: string, credential: unknown) => {
    unwrap(
      await allauthAccount.POST('/_allauth/browser/v1/account/authenticators/webauthn', {
        body: { name, credential: credential as Allauth['WebAuthnCredential'] },
      }),
    )
  },
  removeSecurityKey: async (id: number) => {
    unwrap(await allauthAccount.DELETE('/_allauth/browser/v1/account/authenticators/webauthn', { body: { authenticators: [id] } }))
  },
}

// New codes, shown only here. They replace the old ones once `twoStep.confirmRecoveryCodes` gets one of them back.
export const recoveryPreviewQuery = queryOptions({
  queryKey: accountKeys.recoveryPreview,
  queryFn: async () => unwrap(await api.GET('/api/0/generate-recovery-codes/')).codes,
  staleTime: Infinity,
  gcTime: 0,
  retry: false,
})

/* ---------- Notifications ---------- */

// How one project differs from the account's default.
export const AlertChoice = { inherit: -1, off: 0, on: 1 } as const
export type AlertChoice = (typeof AlertChoice)[keyof typeof AlertChoice]

export const notificationsQuery = queryOptions({
  queryKey: accountKeys.notifications,
  queryFn: async () => unwrap(await api.GET('/api/0/users/{user_id}/notifications/', me)),
})

// Keyed by project id. A project that follows the default is absent or `inherit`.
export const alertsQuery = queryOptions({
  queryKey: accountKeys.alerts,
  queryFn: async () => unwrap(await api.GET('/api/0/users/{user_id}/notifications/alerts/', me)) as Record<string, AlertChoice>,
})

// Every project the user can see, across organizations.
export const allProjectsQuery = queryOptions({
  queryKey: accountKeys.projects,
  queryFn: () => fetchAllPages((cursor) => api.GET('/api/0/projects/', { params: { query: { cursor, limit: MAX_PAGE_SIZE } } })),
})

export const notifications = {
  setDefault: async (subscribeByDefault: boolean) =>
    unwrap(await api.PUT('/api/0/users/{user_id}/notifications/', { ...me, body: { subscribeByDefault } })),
  setProject: async (projectId: string, choice: AlertChoice) => {
    unwrap(await api.PUT('/api/0/users/{user_id}/notifications/alerts/', { ...me, body: { [projectId]: choice } }))
  },
}

/* ---------- API tokens ---------- */

// What a token may touch and how far, in the order the form lists them.
export const TokenResource = { project: 'project', team: 'team', event: 'event', org: 'org', member: 'member' } as const
export type TokenResource = (typeof TokenResource)[keyof typeof TokenResource]
export const TokenLevel = { read: 'read', write: 'write', admin: 'admin' } as const
export type TokenLevel = (typeof TokenLevel)[keyof typeof TokenLevel]
export const TOKEN_RESOURCES = Object.values(TokenResource)
export const TOKEN_LEVELS = Object.values(TokenLevel)
export const RELEASES_SCOPE = 'project:releases'
export type TokenScope = `${TokenResource}:${TokenLevel}` | typeof RELEASES_SCOPE

export const tokensQuery = queryOptions({
  queryKey: accountKeys.tokens,
  queryFn: async () => unwrap(await api.GET('/api/0/api-tokens/')),
})

export const tokens = {
  // The schema types `scopes` as a bitmask; the backend also takes the scope names, which is what the stock UI sends.
  create: async (label: string, scopes: TokenScope[]) =>
    unwrap(await api.POST('/api/0/api-tokens/', { body: { label, scopes: scopes as unknown as number } })),
  revoke: async (id: number) => {
    unwrap(await api.DELETE('/api/0/api-tokens/{token_id}/', { params: { path: { token_id: id } } }))
  },
}

/* ---------- Command-line sign-in ---------- */

// Hands a token to the setup wizard that is waiting on this hash in someone's terminal.
export async function connectWizard(hash: string) {
  unwrap(await api.POST('/api/0/wizard-set-token/', { body: { hash } }))
}

/* ---------- Invitations ---------- */

const inviteParams = (memberId: string, token: string) => ({ params: { path: { org_user_id: Number(memberId), token } } })

// Anyone holding the link may read the invitation; a link that was used or has expired is an error.
export const inviteQuery = (memberId: string, token: string) =>
  queryOptions({
    queryKey: accountKeys.invite(memberId, token),
    queryFn: async () => unwrap(await api.GET('/api/0/accept/{org_user_id}/{token}/', inviteParams(memberId, token))),
    retry: false,
  })

export async function acceptInvite(memberId: string, token: string) {
  return unwrap(await api.POST('/api/0/accept/{org_user_id}/{token}/', { ...inviteParams(memberId, token), body: { acceptInvite: true } }))
}
