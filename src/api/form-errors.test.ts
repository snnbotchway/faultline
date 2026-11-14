import { expect, test } from 'vitest'
import { ApiError } from './client'
import { formProblems } from './form-errors'

const refused = (...errors: { code: string; param?: string; message: string }[]) => new ApiError(400, { status: 400, errors })
const SIGN_IN = ['email', 'password']

test('a wrong password is one message for the form, in our words', () => {
  const error = refused({ code: 'email_password_mismatch', param: 'password', message: 'The email address and/or password you specified are not correct.' })
  expect(formProblems(error, 'sign you in', SIGN_IN)).toEqual({ fields: {}, message: 'Wrong email or password.' })
})

test('a lockout promises no wait time', () => {
  const locked = refused({ code: 'too_many_login_attempts', message: 'Too many failed login attempts. Try again later.' })
  expect(formProblems(locked, 'sign you in', SIGN_IN).message).toBe('Too many tries. Wait a few minutes, then try again.')
  expect(formProblems(new ApiError(429, null), 'sign you in', SIGN_IN).message).toBe('Too many tries. Wait a few minutes, then try again.')
})

test('a problem goes under its field only when the form shows that field', () => {
  const error = refused({ code: 'enter_current_password', param: 'current_password', message: 'Please type your current password.' })
  expect(formProblems(error, 'change your password', ['current_password', 'new_password'])).toEqual({ fields: { current_password: "That isn't your current password." } })
  expect(formProblems(error, 'change your password')).toEqual({ fields: {}, message: "That isn't your current password." })
})

test('the first broken password rule is the one shown', () => {
  const error = refused(
    { code: 'password_too_common', param: 'new_password', message: 'This password is too common.' },
    { code: 'password_entirely_numeric', param: 'new_password', message: 'This password is entirely numeric.' },
  )
  expect(formProblems(error, 'change your password', ['new_password']).fields).toEqual({ new_password: 'That password is too easy to guess. Pick another.' })
})

test("a refusal we don't know never shows the backend's sentence", () => {
  expect(formProblems(refused({ code: 'something_new', param: 'email', message: 'Backend wording.' }), 'sign you in', SIGN_IN)).toEqual({
    fields: {},
    message: "Couldn't sign you in. Try again.",
  })
  expect(formProblems(new ApiError(400, { detail: 'Some new detail' }), 'save your details').message).toBe("Couldn't save your details. Try again.")
})

test('a field the API rejects as too long says the limit', () => {
  const error = new ApiError(422, { detail: [{ type: 'string_too_long', loc: ['body', 'payload', 'name'], msg: 'String should have at most 255 characters', ctx: { max_length: 255 } }] })
  expect(formProblems(error, 'save your details', ['name']).fields).toEqual({ name: 'Use 255 characters or fewer.' })
})
