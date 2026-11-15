import { account } from './account'
import { auth } from './auth'
import { common } from './common'
import { settings } from './settings'
import { shell } from './shell'

// The English words, which are the source: every other language has exactly these keys, with the same arguments.
// One file per area, so areas can be converted in parallel without touching each other's files.
export const en = { common, shell, auth, account, settings }

export type Messages = typeof en
