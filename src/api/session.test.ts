import { expect, test } from 'vitest'
import { toSession } from './auth'

const response = (status: number) => new Response(null, { status })

test('maps allauth session responses to sign-in states', () => {
  const user = { id: 1, display: 'demo@example.com', email: 'demo@example.com', has_usable_password: true }
  expect(toSession(response(200), { data: { user } })).toEqual({ status: 'authenticated', user })
  expect(
    toSession(response(401), {
      data: { flows: [{ id: 'login' }, { id: 'mfa_authenticate', is_pending: true, types: ['totp', 'recovery_codes'] }] },
    }),
  ).toEqual({ status: 'mfaPending', mfaTypes: ['totp', 'recovery_codes'] })
  expect(toSession(response(401), { data: { flows: [{ id: 'provider_signup', is_pending: true }] } })).toEqual({
    status: 'providerSignup',
  })
  expect(toSession(response(401), { data: { flows: [{ id: 'login' }, { id: 'mfa_authenticate' }] } })).toEqual({
    status: 'anonymous',
  })
})
