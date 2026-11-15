import { messages, type Messages } from '@/i18n'
import { ApiError, NetworkError } from './client'

type Errors = Messages['common']['errors']

const STATUS_TEXT: Record<number, keyof Errors['status']> = { 403: 'forbidden', 404: 'gone', 429: 'tooManyRequests' }

// The backend's `detail` strings we know; the catalog words each in the user's words.
const DETAIL_TEXT: Record<string, keyof Errors['detail']> = {
  'Cannot merge issues from different projects': 'mergeProjects',
  'inNextRelease needs a single project': 'nextReleaseProject',
  'Only a status change may omit id': 'onlySelected',
  'User is not a member of this organization': 'notMember',
  'Team not found': 'teamGone',
  'Only existing users may be invited': 'onlyExistingUsers',
  'User must have a verified email address': 'verifyBeforeInvite',
  'User is organization owner. Transfer ownership first.': 'ownerLeaves',
  'Server URL must be an https:// URL': 'httpsOnly',
  'Server URL must not contain credentials': 'noCredentials',
  'Server URL must be a public hostname': 'publicAddress',
  'Server URL must be a public address': 'publicAddress',
  'Server URL is required': 'serverUrlRequired',
  'Maximum number of SSO providers reached': 'tooManyApps',
  'Custom SSO is not included in your plan': 'notInPlan',
}

// Details that name a person or thing, matched by their ending.
const DETAIL_ENDINGS: [string, keyof Errors['detail']][] = [
  [' is already a member', 'alreadyMember'],
  [' is already invited', 'alreadyInvited'],
]

// The thing asked for doesn't exist (or isn't visible to this user).
export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404

// The backend's own sentence for why it refused, when it sent one.
export const detailOf = (error: unknown) =>
  error instanceof ApiError && error.body && typeof error.body === 'object' && 'detail' in error.body && typeof error.body.detail === 'string' ? error.body.detail : undefined

/**
 * What to tell the user when `action` failed ("resolve the issue"). The backend's own
 * wording is written for developers, so it goes to the console and never to the screen.
 */
export function explain(error: unknown, action: string): string {
  console.error(error instanceof ApiError ? (detailOf(error) ?? error.body ?? error) : error)
  const text = messages().common.errors
  const fallback = text.couldnt(action)
  if (error instanceof ApiError) {
    const detail = detailOf(error) ?? ''
    const known = DETAIL_TEXT[detail] ?? DETAIL_ENDINGS.find(([ending]) => detail.endsWith(ending))?.[1]
    if (known) return text.detail[known]
    const status = STATUS_TEXT[error.status]
    return status ? text.status[status] : fallback
  }
  if (error instanceof NetworkError) return text.unreachable
  // Anything else was thrown by this app with a message written for the user.
  return error instanceof Error && error.message ? error.message : fallback
}
