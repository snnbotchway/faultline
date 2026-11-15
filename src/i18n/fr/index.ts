import type { Messages } from '../en'
import { account } from './account'
import { alerts } from './alerts'
import { auth } from './auth'
import { common } from './common'
import { logs } from './logs'
import { performance } from './performance'
import { projects } from './projects'
import { releases } from './releases'
import { issues } from './issues'
import { settings } from './settings'
import { shell } from './shell'
import { uptime } from './uptime'

// French: every key of the English catalog, with the same arguments.
export const fr: Messages = { common, shell, auth, account, settings, performance, logs, uptime, alerts, releases, projects, issues }
