import { expect, test, vi } from 'vitest'
import { ApiError } from './client'
import { checkSignIn, signInProblems } from './sign-in-errors'

const refused = (...errors: { code: string; param?: string; message: string }[]) => new ApiError(400, { status: 400, errors })

test('a wrong password is one message for the form, in our words', () => {
  const error = refused({ code: 'email_password_mismatch', param: 'password', message: 'The email address and/or password you specified are not correct.' })
  expect(signInProblems(error)).toEqual({ fields: {}, message: 'Wrong email or password.' })
})

test('a lockout promises no wait time', () => {
  const locked = refused({ code: 'too_many_login_attempts', message: 'Too many failed login attempts. Try again later.' })
  expect(signInProblems(locked).message).toBe('Too many tries. Wait a few minutes, then try again.')
  expect(signInProblems(new ApiError(429, null)).message).toBe('Too many tries. Wait a few minutes, then try again.')
})

test('a missing field is reported under that field', () => {
  const error = refused({ code: 'required', param: 'email', message: 'This field is required.' }, { code: 'required', param: 'password', message: 'This field is required.' })
  expect(signInProblems(error)).toEqual({ fields: { email: 'Enter your email.', password: 'Enter your password.' } })
})

test("a refusal we don't know never shows the backend's sentence", () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(signInProblems(refused({ code: 'something_new', message: 'Backend wording.' }))).toEqual({ fields: {}, message: "Couldn't sign you in. Try again." })
})

test('the form catches an empty or malformed email before asking the server', () => {
  expect(checkSignIn({ email: '', password: '' }).fields).toEqual({ email: 'Enter your email.', password: 'Enter your password.' })
  expect(checkSignIn({ email: 'demo', password: 'x' }).fields).toEqual({ email: 'Enter a valid email address.' })
  expect(checkSignIn({ email: 'demo@example.com', password: 'x' }).fields).toEqual({})
})
