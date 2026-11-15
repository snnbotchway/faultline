import { useSyncExternalStore } from 'react'
import { en, type Messages } from './en'
import { formatIn } from './format'
import { Locale, browserLocale, isLocale } from './locale'

export { LOCALE_NAMES, Locale, isLocale } from './locale'
export { count, localized, percent, plural } from './format'
export type { Messages } from './en'

// English is in the main bundle and is what a missing language falls back to. Each other language is its own chunk,
// fetched only by someone who reads it.
const LOADERS: Record<Exclude<Locale, typeof Locale.en>, () => Promise<Messages>> = {
  fr: () => import('./fr').then((module) => module.fr),
  nb: () => import('./nb').then((module) => module.nb),
}

// This browser's copy of the choice, read before the first render; the account's `options.language` follows the
// user between browsers (lib/language-sync.ts). No key means the browser's own language.
const KEY = 'language'

let current: { locale: Locale; messages: Messages } = { locale: Locale.en, messages: en }
let latest = 0
const listeners = new Set<() => void>()

export function chosenLocale(): Locale | undefined {
  const saved = localStorage.getItem(KEY)
  return isLocale(saved) ? saved : undefined
}

const emit = () => listeners.forEach((listener) => listener())

// Picks can overlap while a language loads; only the last one is applied. Says whether this one was.
async function apply(locale: Locale): Promise<boolean> {
  const request = ++latest
  const messages = locale === Locale.en ? en : await LOADERS[locale]()
  if (request !== latest) return false
  current = { locale, messages }
  formatIn(locale)
  document.documentElement.lang = locale
  return true
}

/**
 * Loads this browser's language before the first render, as public/theme.js applies the theme, so the first paint is
 * already in it. A language that fails to load leaves English.
 */
export const startLocale = () => apply(chosenLocale() ?? browserLocale(navigator.languages)).catch(() => false)

/**
 * Takes a pick, or `undefined` to follow the browser again. Resolves once the screen is in the new language; rejects,
 * keeping the old one, when the language could not be fetched.
 */
export async function setLocale(locale: Locale | undefined) {
  if (!(await apply(locale ?? browserLocale(navigator.languages)))) return
  if (locale) localStorage.setItem(KEY, locale)
  else localStorage.removeItem(KEY)
  emit()
}

// The words of the language on screen, for code outside a component: a notice, a page title, an error.
export const messages = () => current.messages
export const currentLocale = () => current.locale

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/** The words of the language on screen. A component that shows text reads them here, so it redraws when the language changes. */
export const useT = () => useSyncExternalStore(subscribe, messages)
export const useLocale = () => useSyncExternalStore(subscribe, currentLocale)
export const useChosenLocale = () => useSyncExternalStore(subscribe, chosenLocale)
