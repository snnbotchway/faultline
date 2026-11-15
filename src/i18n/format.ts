import { Locale, formatTag } from './locale'

// The language dates, numbers and plurals follow. The catalogs import this module, so it holds the language itself
// rather than reading it from the module that loads them.
let language: Locale = Locale.en

export function formatIn(locale: Locale) {
  language = locale
}

/**
 * A formatter made once per language and remade when the language changes, for module-level formats:
 * `const day = localized((tag) => new Intl.DateTimeFormat(tag, { day: 'numeric' }))`, then `day().format(time)`.
 */
export function localized<T>(make: (tag: string) => T): () => T {
  let made: { tag: string; value: T } | undefined
  return () => {
    const tag = formatTag(language, navigator.languages)
    if (made?.tag !== tag) made = { tag, value: make(tag) }
    return made.value
  }
}

const numbers = localized((tag) => new Intl.NumberFormat(tag))
const rules = localized((tag) => new Intl.PluralRules(tag))

// `1,234` in English, `1 234` in French and Norwegian.
export const count = (value: number) => numbers().format(value)

const percents = localized((tag) => new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 0 }))

// `25%` in English, `25 %` in French and Norwegian. `value` is out of 100, as the backend's rates are.
export const percent = (value: number) => percents().format(value / 100)

// The words for each of a language's plural categories. Only `other` is required; a missing category falls back to it.
export type PluralForms = { other: string } & Partial<Record<Exclude<Intl.LDMLPluralRule, 'other'>, string>>

/**
 * `plural(3, { one: '# issue', other: '# issues' })` is `3 issues`; `#` is the count, formatted. French puts 0 and 1
 * under `one` and a round million under `many` (`1 000 000 de problèmes`). A count already worded (`1000+`) is shown
 * as it is, with `other`.
 */
export function plural(value: number | string, forms: PluralForms): string {
  if (typeof value === 'string') return forms.other.replaceAll('#', value)
  return (forms[rules().select(value)] ?? forms.other).replaceAll('#', count(value))
}
