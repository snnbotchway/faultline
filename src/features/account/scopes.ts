import { RELEASES_SCOPE, TOKEN_LEVELS, TOKEN_RESOURCES, TokenResource, type TokenLevel } from '@/api/account'

// What a token may touch, in the order the form lists them.
export const RESOURCE_LABELS: Record<TokenResource, string> = {
  project: 'Projects',
  team: 'Teams',
  event: 'Events',
  org: 'Organization',
  member: 'Members',
}

export const LEVEL_LABELS: Record<TokenLevel, string> = { read: 'Read', write: 'Write', admin: 'Admin' }

export const RELEASES_LABEL = 'Releases'

/** `project:read project:write project:releases` in the form's own words: "Projects: Read, Write · Releases". */
export function scopeWords(scopes: string[]): string {
  const known = new Set(scopes)
  const parts: string[] = []
  for (const resource of TOKEN_RESOURCES) {
    const levels = TOKEN_LEVELS.filter((level) => known.delete(`${resource}:${level}`)).map((level) => LEVEL_LABELS[level])
    if (levels.length) parts.push(`${RESOURCE_LABELS[resource]}: ${levels.join(', ')}`)
    if (resource === TokenResource.project && known.delete(RELEASES_SCOPE)) parts.push(RELEASES_LABEL)
  }
  // A scope this version does not know is shown as the backend names it, rather than hidden.
  return [...parts, ...known].join(' · ')
}
