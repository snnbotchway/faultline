import { TEAM_SLUG_PATTERN } from '@/api/teams'
import { messages } from '@/i18n'

/**
 * Why a team cannot take this name, in the user's words, or undefined when it can. The backend answers a name
 * that is already taken with a server error, so that case has to be caught here.
 */
export function teamSlugError(slug: string, taken: string[]): string | undefined {
  const value = slug.trim()
  const text = messages().settings.teamsPage
  if (!value) return text.needsName
  if (!TEAM_SLUG_PATTERN.test(value)) return text.badCharacters
  if (taken.some((other) => other.toLowerCase() === value.toLowerCase())) return text.taken(value)
  return undefined
}
