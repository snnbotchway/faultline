import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { currentUserQuery } from '@/api/organizations'
import { chosenLocale, currentLocale, isLocale, messages, setLocale, type Locale } from '@/i18n'
import { notify } from './notice'
import { SyncedOption, useSaveOption } from './options-sync'

/**
 * Takes the language saved on the account, when it first loads and whenever it changes. The account is the record of
 * the choice; this browser's copy only lets the first paint, and the signed-out screens, be in it. An account with no
 * language (or one Faultline does not have) follows the browser.
 */
export function useLanguageSync() {
  const user = useQuery(currentUserQuery).data
  const loaded = user !== undefined
  const saved = user?.options.language
  useEffect(() => {
    if (!loaded) return
    const wanted = isLocale(saved) ? saved : undefined
    // Also when this browser's pick failed to load at start, so it is tried again.
    if (wanted !== chosenLocale() || (wanted && wanted !== currentLocale())) void setLocale(wanted).catch(() => undefined)
  }, [loaded, saved])
}

/** Switches the screen to a language, or back to the browser's with `undefined`, and saves the pick to the account. */
export function useChooseLanguage() {
  const save = useSaveOption()
  return (locale: Locale | undefined) =>
    void setLocale(locale).then(
      (applied) => applied && save(SyncedOption.language, locale ?? null),
      () => notify(messages().shell.language.loadFailed, true),
    )
}
