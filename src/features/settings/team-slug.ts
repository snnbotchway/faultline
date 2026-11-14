import { TEAM_SLUG_PATTERN } from '@/api/teams'

/**
 * Why a team cannot take this name, in the user's words, or undefined when it can. The backend answers a name
 * that is already taken with a server error, so that case has to be caught here.
 */
export function teamSlugError(slug: string, taken: string[]): string | undefined {
  const value = slug.trim()
  if (!value) return 'Give the team a name.'
  if (!TEAM_SLUG_PATTERN.test(value)) return 'Use letters, numbers, hyphens and underscores only.'
  if (taken.some((other) => other.toLowerCase() === value.toLowerCase())) return `There is already a team called #${value}.`
  return undefined
}
