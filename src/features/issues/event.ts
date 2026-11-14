import { EventEntryType, type Issue, type IssueEvent } from '@/api/issues'

// The event's entries are loosely typed by the backend; these are the fields the screens read.
export type Frame = {
  filename?: string | null
  absPath?: string | null
  module?: string | null
  function?: string | null
  lineNo?: number | null
  colNo?: number | null
  inApp?: boolean
  context?: [number, string][] | null
  vars?: Record<string, unknown> | null
}
export type ExceptionValue = {
  type?: string | null
  value?: string | null
  module?: string | null
  stacktrace?: { frames?: Frame[] | null } | null
  mechanism?: { type?: string; handled?: boolean | null } | null
}
export type Crumb = {
  type?: string | null
  category?: string | null
  message?: string | null
  data?: Record<string, unknown> | null
  level?: string | null
  timestamp?: string | null
}
export type RequestEntry = {
  method?: string | null
  url?: string | null
  query?: [string, string][] | null
  headers?: [string, string][] | null
  data?: unknown
  cookies?: [string, string][] | null
  env?: Record<string, unknown> | null
}

function entry<T>(event: IssueEvent, type: EventEntryType): T | undefined {
  const found = (event.entries as { type: string; data: unknown }[] | undefined)?.find((item) => item.type === type)
  return found?.data as T | undefined
}

// Outermost first: the last exception is the one that was raised, the earlier ones caused it.
export const exceptionsOf = (event: IssueEvent) => entry<{ values?: ExceptionValue[] }>(event, EventEntryType.exception)?.values ?? []
export const crumbsOf = (event: IssueEvent) => entry<{ values?: Crumb[] }>(event, EventEntryType.breadcrumbs)?.values ?? []
export const requestOf = (event: IssueEvent) => entry<RequestEntry>(event, EventEntryType.request)
export const messageOf = (event: IssueEvent) => entry<{ formatted?: string; message?: string }>(event, EventEntryType.message)

// Frames arrive oldest call first; the screen reads from where it threw.
export const framesOf = (exception: ExceptionValue) => [...(exception.stacktrace?.frames ?? [])].reverse()

export function throwingFrame(event: IssueEvent): Frame | undefined {
  const frames = framesOf(exceptionsOf(event).at(-1) ?? {})
  return frames.find((frame) => frame.inApp) ?? frames[0]
}

export function crumbText(crumb: Crumb): string {
  if (crumb.message) return crumb.message
  const data = crumb.data ?? {}
  if (data.url) return [data.method, data.url, data.status_code && `→ ${String(data.status_code)}`].filter(Boolean).join(' ')
  return Object.entries(data)
    .map(([key, value]) => `${key}=${valueText(value)}`)
    .join(' ')
}

// What kind of step a breadcrumb is: its category, or else its type.
export const crumbKind = (crumb: Crumb) => crumb.category ?? crumb.type

export const frameFile = (frame: Frame) => frame.filename ?? frame.module ?? frame.absPath ?? '?'

// Tag, header and variable values arrive as strings or as structured data.
export const valueText = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))

// An error's type and message, kept apart so the type can be set as code. Issues without a type have only a title.
export function errorParts(issue: Pick<Issue, 'metadata' | 'title'>): { type?: string; text: string } {
  const { type, value } = issue.metadata as { type?: string; value?: string }
  return type ? { type, text: value ?? '' } : { text: issue.title }
}
