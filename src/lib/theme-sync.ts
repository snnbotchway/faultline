import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { account } from '@/api/account'
import { currentUserQuery } from '@/api/organizations'
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

/** Applies a pick now and saves it to the user's account; a save that fails leaves it applied on this browser only. */
export function useChooseTheme() {
  const queryClient = useQueryClient()
  return async (theme: Theme) => {
    setTheme(theme)
    try {
      const user = await queryClient.ensureQueryData(currentUserQuery)
      const saved = await account.update({ name: user.name, options: { ...user.options, preferredTheme: theme } })
      queryClient.setQueryData(currentUserQuery.queryKey, saved)
    } catch {
      // The choice still holds on this browser, and a toast about a preference would only be noise.
    }
  }
}
