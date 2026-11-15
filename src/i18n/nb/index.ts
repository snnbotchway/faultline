import type { Messages } from '../en'
import { account } from './account'
import { auth } from './auth'
import { common } from './common'
import { settings } from './settings'
import { shell } from './shell'

// Norwegian Bokmål: every key of the English catalog, with the same arguments.
export const nb: Messages = { common, shell, auth, account, settings }
