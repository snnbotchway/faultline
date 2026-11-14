import type { IssueEvent } from '@/api/issues'

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

function entry<T>(event: IssueEvent, type: string): T | undefined {
  const found = (event.entries as { type: string; data: unknown }[] | undefined)?.find((item) => item.type === type)
  return found?.data as T | undefined
}

// Outermost first: the last exception is the one that was raised, the earlier ones caused it.
export const exceptionsOf = (event: IssueEvent) => entry<{ values?: ExceptionValue[] }>(event, 'exception')?.values ?? []
export const crumbsOf = (event: IssueEvent) => entry<{ values?: Crumb[] }>(event, 'breadcrumbs')?.values ?? []
export const requestOf = (event: IssueEvent) => entry<RequestEntry>(event, 'request')
export const messageOf = (event: IssueEvent) => entry<{ formatted?: string; message?: string }>(event, 'message')

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
    .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' ')
}

export const frameFile = (frame: Frame) => frame.filename ?? frame.module ?? frame.absPath ?? '?'
