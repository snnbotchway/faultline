import type { Messages } from '../en'
import { account } from './account'
import { auth } from './auth'
import { common } from './common'
import { logs } from './logs'
import { performance } from './performance'
import { settings } from './settings'
import { shell } from './shell'

// French: every key of the English catalog, with the same arguments.
export const fr: Messages = { common, shell, auth, account, settings, performance, logs }
