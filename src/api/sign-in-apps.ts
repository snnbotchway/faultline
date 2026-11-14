import { queryOptions } from '@tanstack/react-query'
import { backendAddress } from './base'
import { api, orgPath, unwrap } from './client'
import { organizationKeys } from './organizations'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
// A single sign-on provider the organization runs itself. The backend calls these social apps.
export type SignInApp = Schemas['OrganizationSocialAppSchema']

// Google's issuer is fixed; any other OpenID Connect provider needs its address.
export const SignInProvider = { openIdConnect: 'openid_connect', google: 'google' } as const
export type SignInProvider = (typeof SignInProvider)[keyof typeof SignInProvider]

export const SIGN_IN_APP_NAME_MAX = 40
export const SIGN_IN_APPS_MAX = 10
// The longest client ID and secret, and provider address, the backend stores.
export const SIGN_IN_CLIENT_MAX = 191
export const SIGN_IN_SERVER_URL_MAX = 500

export type SignInAppInput = { name: string; serverUrl: string | null; clientID: string; clientSecret: string | null }

export const signInAppKeys = { all: (org: string) => [...organizationKeys.detail(org), 'sign-in-apps'] as const }

const appPath = (org: string, id: number) => ({ ...orgPath(org), social_app_id: id })

const withAddresses = (app: SignInApp): SignInApp => ({
  ...app,
  callbackUrl: app.callbackUrl && backendAddress(app.callbackUrl),
  loginUrl: backendAddress(app.loginUrl),
})

export const signInAppsQuery = (org: string) =>
  queryOptions({
    queryKey: signInAppKeys.all(org),
    queryFn: async () =>
      unwrap(await api.GET('/api/0/organizations/{organization_id_or_slug}/social-apps/', { params: { path: orgPath(org) } })).map(withAddresses),
  })

export const signInAppActions = {
  create: async (org: string, provider: SignInProvider, { clientSecret, ...input }: SignInAppInput) =>
    withAddresses(
      unwrap(
        await api.POST('/api/0/organizations/{organization_id_or_slug}/social-apps/', {
          params: { path: orgPath(org) },
          body: { ...input, provider, clientSecret: clientSecret ?? '' },
        }),
      ),
    ),
  // A null secret keeps the one the backend holds.
  update: async (org: string, id: number, input: SignInAppInput) =>
    withAddresses(
      unwrap(await api.PUT('/api/0/organizations/{organization_id_or_slug}/social-apps/{social_app_id}/', { params: { path: appPath(org, id) }, body: input })),
    ),
  remove: async (org: string, id: number) =>
    unwrap(await api.DELETE('/api/0/organizations/{organization_id_or_slug}/social-apps/{social_app_id}/', { params: { path: appPath(org, id) } })),
}
