import { IssueStatus } from '@/api/issues'
import { messages } from '@/i18n'

// Everything that depends on an issue's status reads these, so the tabs, buttons, keys and commands change together.
const STATUS_KEY: Record<IssueStatus, string> = {
  [IssueStatus.unresolved]: 'u',
  [IssueStatus.resolved]: 'e',
  [IssueStatus.ignored]: 'i',
}

// A status's name, the verb that moves an issue into it, and its key.
export const statusWords = (status: IssueStatus) => ({ ...messages().issues.status[status], key: STATUS_KEY[status] })

const STATUSES = Object.keys(STATUS_KEY) as IssueStatus[]
export const isStatus = (value: string): value is IssueStatus => value in STATUS_KEY

// The inbox shows one status, or every issue.
export const StatusView = { ...IssueStatus, all: 'all' } as const
export type StatusView = (typeof StatusView)[keyof typeof StatusView]

const VIEWS: StatusView[] = [...STATUSES, StatusView.all]

export const statusViews = () => VIEWS.map((view) => ({ view, label: view === StatusView.all ? messages().issues.status.all : statusWords(view).label }))

export const isView = (value: string): value is StatusView => VIEWS.some((view) => view === value)

const ACTION_ORDER = [IssueStatus.resolved, IssueStatus.unresolved, IssueStatus.ignored]

// The status changes on offer, the main one first. `current` is the status every affected issue already has, if they share one.
export function statusActions(current: StatusView | undefined) {
  return ACTION_ORDER.filter((status) => status !== current).map((status) => ({ status, ...statusWords(status) }))
}

// The other actions with a key. Hotkeys, commands and buttons all read the key from here.
export const ACTION = {
  assign: { key: 'a', get label() { return messages().issues.assign } },
  merge: { key: 'm', get label() { return messages().issues.merge } },
  resolveNext: { get label() { return messages().issues.resolveNext } },
} as const
