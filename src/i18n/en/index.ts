import { account } from './account'
import { auth } from './auth'
import { common } from './common'
import { logs } from './logs'
import { performance } from './performance'
import { settings } from './settings'
import { shell } from './shell'
import { uptime } from './uptime'

// The English words, which are the source: every other language has exactly these keys, with the same arguments.
// One file per area, so areas can be converted in parallel without touching each other's files.
export const en = { common, shell, auth, account, settings, performance, logs, uptime }

export type Messages = typeof en
