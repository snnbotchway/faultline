import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { account, type CurrentUser } from '@/api/account'
import { currentUserQuery } from '@/api/organizations'
import { messages } from '@/i18n'
import { notify } from './notice'

type Options = CurrentUser['options']
// The preferences this browser picks and the account keeps, so they follow the user (theme-sync.ts, language-sync.ts).
export const SyncedOption = { preferredTheme: 'preferredTheme', language: 'language' } as const
export type SyncedOption = (typeof SyncedOption)[keyof typeof SyncedOption]

// One save at a time, of the latest picks: picks made while a save is out wait, and only the last of each is sent.
let waiting: Partial<Options> = {}
let saving = false

const failure = (picked: Partial<Options>) => ('language' in picked ? messages().shell.language.saveFailed : messages().shell.themeSaveFailed)

async function saveLatest(queryClient: QueryClient) {
  if (saving) return
  saving = true
  let picked: Partial<Options> = {}
  try {
    // Fresh, so the rest of the user's options and their name go back as they are now.
    let user = await queryClient.fetchQuery({ ...currentUserQuery, staleTime: 0 })
    while (Object.keys(waiting).length > 0) {
      picked = waiting
      waiting = {}
      user = await account.update({ name: user.name, options: { ...user.options, ...picked } })
    }
    // Only the last answer is cached, so a sync never applies a pick that was already replaced.
    // A refresh sent before the save would bring the old choice back.
    await queryClient.cancelQueries({ queryKey: currentUserQuery.queryKey })
    queryClient.setQueryData(currentUserQuery.queryKey, user)
  } catch {
    const lost = { ...picked, ...waiting }
    waiting = {}
    // The account keeps its old choice, which this browser takes again on the next load.
    notify(failure(lost), true)
  } finally {
    saving = false
  }
}

/** Saves a pick to the user's account, after the caller has applied it. */
export function useSaveOption() {
  const queryClient = useQueryClient()
  return (option: SyncedOption, value: Options[SyncedOption]) => {
    waiting = { ...waiting, [option]: value }
    void saveLatest(queryClient)
  }
}
