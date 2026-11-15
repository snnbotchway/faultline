import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { currentUserQuery } from '@/api/organizations'
import { SyncedOption, useSaveOption } from './options-sync'
import { Theme, getTheme, isTheme, setTheme } from './theme'

/**
 * Takes the theme the user chose in another browser, when it first loads and whenever it changes. A user with no
 * saved choice keeps this browser's, which stays the fallback.
 */
export function useThemeSync() {
  const preferred = useQuery(currentUserQuery).data?.options.preferredTheme
  useEffect(() => {
    if (isTheme(preferred) && preferred !== getTheme()) setTheme(preferred)
  }, [preferred])
}

/** Applies a pick now and saves it to the user's account. */
export function useChooseTheme() {
  const save = useSaveOption()
  return (theme: Theme) => {
    setTheme(theme)
    save(SyncedOption.preferredTheme, theme)
  }
}
