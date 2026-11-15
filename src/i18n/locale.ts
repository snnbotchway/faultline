// The languages Faultline is written in: the stock GlitchTip UI's three.
export const Locale = { en: 'en', fr: 'fr', nb: 'nb' } as const
export type Locale = (typeof Locale)[keyof typeof Locale]
export const isLocale = (value: unknown): value is Locale => Object.values<unknown>(Locale).includes(value)

// Each language by its own name, so a reader finds theirs whatever the screen is in now.
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', fr: 'Français', nb: 'Norsk bokmål' }

// "Norwegian" in general, and Nynorsk, read Bokmål sooner than English. Stock maps `no` the same way.
const ALIASES: Record<string, Locale> = { no: Locale.nb, nn: Locale.nb }

const baseOf = (tag: string) => tag.toLowerCase().split('-')[0] ?? ''

const languageOf = (tag: string) => {
  const base = baseOf(tag)
  return isLocale(base) ? base : ALIASES[base]
}

// The first of the browser's languages that Faultline has, else English.
export const browserLocale = (languages: readonly string[]): Locale => languages.map(languageOf).find((locale) => locale !== undefined) ?? Locale.en

/**
 * The tag dates and numbers are formatted with: the browser's own variant of the language when it has one (en-GB
 * writes `14 Nov`, en-US `Nov 14`), else the language itself.
 */
export const formatTag = (locale: Locale, languages: readonly string[]) => languages.find((tag) => baseOf(tag) === locale) ?? locale
