import { ApiError, NetworkError } from './client'

const STATUS_TEXT: Record<number, string> = {
  403: "You don't have permission to do that.",
  404: "That's no longer there. Reload the page.",
  429: 'Too many requests. Wait a moment, then try again.',
}

// The backend's `detail` strings we know, in the user's words.
const DETAIL_TEXT: Record<string, string> = {
  'Cannot merge issues from different projects': 'Only issues from the same project can be merged.',
  'inNextRelease needs a single project': 'Pick issues from one project to resolve them in the next release.',
  'Only a status change may omit id': 'That can only be done to issues you selected one by one.',
  'User is not a member of this organization': "That person isn't in this organization any more.",
  'Team not found': 'That team no longer exists.',
  'Only existing users may be invited': 'Sign-up is closed on this server, so only people who already have an account can be invited.',
  'User must have a verified email address': 'Verify your own email address before you invite people.',
  'User is organization owner. Transfer ownership first.': 'The owner can only leave after transferring ownership to someone else.',
}

// Details that name a person or thing, matched by their ending.
const DETAIL_ENDINGS: [string, string][] = [
  [' is already a member', "They're already a member of this organization."],
  [' is already invited', "They're already invited. Open their row to send the invite again."],
]

const detailOf = (error: ApiError) =>
  error.body && typeof error.body === 'object' && 'detail' in error.body && typeof error.body.detail === 'string' ? error.body.detail : undefined

/**
 * What to tell the user when `action` failed ("resolve the issue"). The backend's own
 * wording is written for developers, so it goes to the console and never to the screen.
 */
export function explain(error: unknown, action: string): string {
  console.error(error instanceof ApiError ? (detailOf(error) ?? error.body ?? error) : error)
  const fallback = `Couldn't ${action}. Try again.`
  if (error instanceof ApiError) {
    const detail = detailOf(error) ?? ''
    return DETAIL_TEXT[detail] ?? DETAIL_ENDINGS.find(([ending]) => detail.endsWith(ending))?.[1] ?? STATUS_TEXT[error.status] ?? fallback
  }
  if (error instanceof NetworkError) return "Couldn't reach the server. Check your connection, then try again."
  // Anything else was thrown by this app with a message written for the user.
  return error instanceof Error && error.message ? error.message : fallback
}
