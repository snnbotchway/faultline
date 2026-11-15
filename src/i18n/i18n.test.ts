import { afterEach, expect, test } from 'vitest'
import { ago, bytes } from '@/features/issues/format'
import { rangeText, share } from '@/features/settings/usage'
import { Locale, count, messages, percent, plural, setLocale } from '.'
import { browserLocale, formatTag } from './locale'

// Narrow and ordinary no-break spaces, which French and Norwegian put in numbers and before some punctuation.
const spaced = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ')

afterEach(() => setLocale(Locale.en))

test('the browser picks the first language Faultline has, reading Norwegian and Nynorsk as Bokmål', () => {
  expect(browserLocale(['de-DE', 'fr-CA', 'en'])).toBe(Locale.fr)
  expect(browserLocale(['no'])).toBe(Locale.nb)
  expect(browserLocale(['nn-NO', 'en'])).toBe(Locale.nb)
  expect(browserLocale(['de', 'es'])).toBe(Locale.en)
  expect(browserLocale([])).toBe(Locale.en)
})

test("dates and numbers use the browser's own variant of the chosen language, else the language", () => {
  expect(formatTag(Locale.en, ['en-GB', 'fr'])).toBe('en-GB')
  expect(formatTag(Locale.fr, ['en-GB', 'fr-CA'])).toBe('fr-CA')
  expect(formatTag(Locale.nb, ['en-US'])).toBe('nb')
})

test('French counts 0 and 1 as one, and a round million with "de"', async () => {
  await setLocale(Locale.fr)
  const issues = { one: '# problème', many: '# de problèmes', other: '# problèmes' }
  expect(plural(0, issues)).toBe('0 problème')
  expect(plural(1, issues)).toBe('1 problème')
  expect(spaced(plural(2_000, issues))).toBe('2 000 problèmes')
  expect(spaced(plural(1_000_000, issues))).toBe('1 000 000 de problèmes')
  expect(messages().common.projects(0)).toBe('0 projet')
})

test('Norwegian counts 0 as other, and a count already worded keeps its words', async () => {
  await setLocale(Locale.nb)
  expect(messages().common.projects(0)).toBe('0 prosjekter')
  expect(messages().common.projects(1)).toBe('1 prosjekt')
  expect(plural('1000+', { one: '# hendelse', other: '# hendelser' })).toBe('1000+ hendelser')
})

test('numbers, percents and sizes follow the language on screen', async () => {
  expect([count(1234), percent(25), bytes(1_400_000)]).toEqual(['1,234', '25%', '1.4 MB'])
  await setLocale(Locale.fr)
  expect([count(1234), percent(25), bytes(1_400_000)].map(spaced)).toEqual(['1 234', '25 %', '1,4 Mo'])
  expect([share(1, 4810), rangeText({ min: 0, max: 10 }), rangeText({ min: 25, max: 33 })].map(spaced)).toEqual(['<1 %', 'jusqu’à 10 %', '25–33 %'])
})

test('how long ago is written in the language on screen', async () => {
  const now = new Date('2026-01-10T12:00:00Z')
  expect(ago(new Date('2026-01-10T09:00:00Z'), now)).toBe('3h')
  await setLocale(Locale.fr)
  expect(spaced(ago(new Date('2026-01-10T09:00:00Z'), now))).toBe('3 h')
  await setLocale(Locale.nb)
  expect(spaced(ago(new Date('2026-01-08T12:00:00Z'), now))).toBe('2 d')
})

test('a French failure joins its action with "de", or "d’" before a vowel', async () => {
  await setLocale(Locale.fr)
  const { couldnt } = messages().common.errors
  expect(couldnt('renommer le projet')).toBe('Impossible de renommer le projet. Réessayez.')
  expect(couldnt('envoyer le lien')).toBe('Impossible d’envoyer le lien. Réessayez.')
})

test('a pick is kept in this browser, and clearing it follows the browser again', async () => {
  await setLocale(Locale.fr)
  expect([localStorage.getItem('language'), document.documentElement.lang]).toEqual(['fr', 'fr'])
  await setLocale(undefined)
  expect([localStorage.getItem('language'), document.documentElement.lang]).toEqual([null, 'en'])
})
