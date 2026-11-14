import { expect, test } from 'vitest'
import { parseEmails } from './invite'

test('addresses pasted from anywhere are split, and each is invited once', () => {
  expect(parseEmails('ada@example.com, kwame@example.com;\n<efua@example.com>  ada@example.com')).toEqual({
    emails: ['ada@example.com', 'kwame@example.com', 'efua@example.com'],
    invalid: [],
  })
})

test('a piece that is not an address is reported, not sent', () => {
  expect(parseEmails('ada@example.com, kwame, @example.com')).toEqual({ emails: ['ada@example.com'], invalid: ['kwame', '@example.com'] })
})
