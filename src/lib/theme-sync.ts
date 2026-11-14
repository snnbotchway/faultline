import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { account } from '@/api/account'
import { currentUserQuery } from '@/api/organizations'
import { notify } from './notice'
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

// One save at a time, of the latest pick: picks made while a save is out wait, and only the last of them is sent.
let waiting: Theme | undefined
let saving = false

async function saveLatest(queryClient: QueryClient) {
  if (saving) return
  saving = true
  try {
    // Fresh, so the rest of the user's options and their name go back as they are now.
    let user = await queryClient.fetchQuery({ ...currentUserQuery, staleTime: 0 })
    while (waiting) {
      const theme = waiting
      waiting = undefined
      user = await account.update({ name: user.name, options: { ...user.options, preferredTheme: theme } })
    }
    // Only the last answer is cached, so useThemeSync never applies a pick that was already replaced.
    // A refresh sent before the save would bring the old theme back.
    await queryClient.cancelQueries({ queryKey: currentUserQuery.queryKey })
    queryClient.setQueryData(currentUserQuery.queryKey, user)
  } catch {
    waiting = undefined
    // The account keeps its old theme, which this browser takes again on the next load.
    notify("Couldn't save your theme. Pick it again to retry.", true)
  } finally {
    saving = false
  }
}

/** Applies a pick now and saves it to the user's account. */
export function useChooseTheme() {
  const queryClient = useQueryClient()
  return (theme: Theme) => {
    setTheme(theme)
    waiting = theme
    void saveLatest(queryClient)
  }
}
