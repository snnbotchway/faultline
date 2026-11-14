import { expect, test } from 'vitest'
import { checkForm } from './form-check'

function form(html: string) {
  const element = document.createElement('form')
  element.innerHTML = html
  return element
}

test("a form names each field that breaks its own rules, in the form's words", () => {
  const filled = form(`
    <input name="name" required value="  ">
    <input name="email" type="email" required value="demo">
    <input name="password" minlength="8" value="short">
    <input name="label" maxlength="4" value="too long">
    <input name="note" value="">
  `)
  expect(checkForm(filled).fields).toEqual({
    name: 'Fill this in.',
    email: 'Enter a valid email address.',
    password: 'Use 8 or more characters.',
    label: 'Use 4 characters or fewer.',
  })
})

test('a form whose fields keep their rules has nothing to say', () => {
  const filled = form(`<input name="email" type="email" required value="demo@example.com"><input name="password" minlength="8" value="long enough">`)
  expect(checkForm(filled).fields).toEqual({})
})
