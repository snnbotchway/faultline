import { expect, test } from 'vitest'
import { SessionStatus, safeNext, toSession } from './auth'

const response = (status: number) => new Response(null, { status })

test('follows only same-origin paths after sign-in', () => {
  expect(safeNext('/demo-co/issues/12?query=is:unresolved')).toBe('/demo-co/issues/12?query=is:unresolved')
  for (const unsafe of ['//evil.example', '/\\evil.example', '/\t/evil.example', 'https://evil.example', 'javascript:alert(1)', undefined]) {
    expect(safeNext(unsafe)).toBeUndefined()
  }
})

test('a signed-in session carries the user', () => {
  const user = { id: 1, display: 'demo@example.com', email: 'demo@example.com', has_usable_password: true }
  expect(toSession(response(200), { data: { user } })).toEqual({ status: SessionStatus.authenticated, user })
})

test('a password accepted with a second factor still to enter asks for MFA', () => {
  const flows = [{ id: 'login' as const }, { id: 'mfa_authenticate' as const, is_pending: true as const, types: ['totp' as const, 'recovery_codes' as const] }]
  expect(toSession(response(401), { data: { flows } })).toEqual({
    status: SessionStatus.mfaPending,
    mfaTypes: ['totp', 'recovery_codes'],
  })
})

test('a social sign-in without an email asks for one', () => {
  expect(toSession(response(401), { data: { flows: [{ id: 'provider_signup', is_pending: true }] } })).toEqual({
    status: SessionStatus.providerSignup,
  })
})

test('available but not pending flows mean signed out', () => {
  expect(toSession(response(401), { data: { flows: [{ id: 'login' }, { id: 'mfa_authenticate' }] } })).toEqual({
    status: SessionStatus.anonymous,
  })
})
