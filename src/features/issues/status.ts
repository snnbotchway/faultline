import { IssueStatus } from '@/api/issues'

// Everything that depends on an issue's status reads this table, so the tabs, buttons, keys and commands change together.
export const STATUS: Record<IssueStatus, { label: string; action: string; key: string }> = {
  [IssueStatus.unresolved]: { label: 'Unresolved', action: 'Unresolve', key: 'u' },
  [IssueStatus.resolved]: { label: 'Resolved', action: 'Resolve', key: 'e' },
  [IssueStatus.ignored]: { label: 'Ignored', action: 'Ignore', key: 'i' },
}

const STATUSES = Object.keys(STATUS) as IssueStatus[]
export const isStatus = (value: string): value is IssueStatus => value in STATUS

// The inbox shows one status, or every issue.
export const StatusView = { ...IssueStatus, all: 'all' } as const
export type StatusView = (typeof StatusView)[keyof typeof StatusView]

export const STATUS_VIEWS: { view: StatusView; label: string }[] = [
  ...STATUSES.map((status) => ({ view: status, label: STATUS[status].label })),
  { view: StatusView.all, label: 'All' },
]

export const isView = (value: string): value is StatusView => STATUS_VIEWS.some((item) => item.view === value)

const ACTION_ORDER = [IssueStatus.resolved, IssueStatus.unresolved, IssueStatus.ignored]

// The status changes on offer, the main one first. `current` is the status every affected issue already has, if they share one.
export function statusActions(current: StatusView | undefined) {
  return ACTION_ORDER.filter((status) => status !== current).map((status) => ({ status, ...STATUS[status] }))
}

// The other actions with a key. Hotkeys, commands and buttons all read the key from here.
export const ACTION = {
  assign: { label: 'Assign', key: 'a' },
  merge: { label: 'Merge', key: 'm' },
  resolveNext: { label: 'Resolve in next release' },
} as const
