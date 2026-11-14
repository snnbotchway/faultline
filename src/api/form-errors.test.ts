import { expect, test, vi } from 'vitest'
import { ApiError } from './client'
import { formProblems } from './form-errors'

const refused = (...errors: { code: string; param?: string; message: string }[]) => new ApiError(400, { status: 400, errors })

test('a problem goes under its field only when the form shows that field', () => {
  const error = refused({ code: 'unverified_email', param: 'code', message: 'You cannot activate two-factor authentication until you have verified your email address.' })
  const wording = 'Verify every email on your account first, or remove the ones you no longer use.'
  expect(formProblems(error, 'turn on the app', ['code'])).toEqual({ fields: { code: wording } })
  expect(formProblems(error, 'turn on the app')).toEqual({ fields: {}, message: wording })
})

test('the first broken password rule is the one shown', () => {
  const error = refused(
    { code: 'password_too_common', param: 'new_password', message: 'This password is too common.' },
    { code: 'password_entirely_numeric', param: 'new_password', message: 'This password is entirely numeric.' },
  )
  expect(formProblems(error, 'change your password', ['current_password', 'new_password']).fields).toEqual({ new_password: 'That password is too easy to guess. Pick another.' })
})

test("a refusal we don't know never shows the backend's sentence", () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(formProblems(refused({ code: 'something_new', param: 'email', message: 'Backend wording.' }), 'add that email', ['email'])).toEqual({
    fields: {},
    message: "Couldn't add that email. Try again.",
  })
  expect(formProblems(new ApiError(400, { detail: 'Some new detail' }), 'save your details').message).toBe("Couldn't save your details. Try again.")
})

test('a field the API rejects as too long says the limit', () => {
  const error = new ApiError(422, { detail: [{ type: 'string_too_long', loc: ['body', 'payload', 'name'], msg: 'String should have at most 255 characters', ctx: { max_length: 255 } }] })
  expect(formProblems(error, 'save your details', ['name']).fields).toEqual({ name: 'Use 255 characters or fewer.' })
})
