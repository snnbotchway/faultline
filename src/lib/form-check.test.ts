import { expect, test } from 'vitest'
import { checkForm } from './form-check'

const check = (html: string) => {
  const form = document.createElement('form')
  form.innerHTML = html
  return checkForm(form).fields
}

test('a required field left empty, or only spaces, asks to be filled in; an optional one does not', () => {
  expect(check('<input name="name" required value="  "><input name="note" value="">')).toEqual({ name: 'Fill this in.' })
})

test('a password of only spaces is empty, because the backend strips passwords too', () => {
  expect(check('<input name="password" type="password" required value="     ">')).toEqual({ password: 'Fill this in.' })
})

test('a malformed email asks for a valid one', () => {
  expect(check('<input name="email" type="email" value="demo">')).toEqual({ email: 'Enter a valid email address.' })
  expect(check('<input name="email" type="email" value="demo@example.com">')).toEqual({})
})

test('a password shorter than its minimum says the minimum, not counting the spaces the backend strips', () => {
  expect(check('<input name="password" type="password" minlength="8" value="  qh7-x2  ">')).toEqual({ password: 'Use 8 or more characters.' })
  expect(check('<input name="password" type="password" minlength="8" value="quiet-harbour">')).toEqual({})
})

test('a value longer than its maximum says the maximum', () => {
  expect(check('<input name="label" maxlength="4" value="too long">')).toEqual({ label: 'Use 4 characters or fewer.' })
})
