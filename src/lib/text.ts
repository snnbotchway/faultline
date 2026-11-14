// `issue` or `issues`: the word for a count, for when the count is shown apart from it. `count` may already be worded (`1000+`).
export const countWord = (count: number | string, one: string, many = `${one}s`) => (String(count) === '1' ? one : many)

// `1 issue`, `3 issues`.
export const plural = (count: number | string, one: string, many = `${one}s`) => `${count} ${countWord(count, one, many)}`

// The words of a search box, for matching in any order and case.
export const searchWords = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

// Whether every word appears somewhere in the text.
export const hasWords = (text: string, words: string[]) => {
  const lower = text.toLowerCase()
  return words.every((word) => lower.includes(word))
}

// A release as people say it: a full commit hash (40 hex characters for SHA-1, 64 for SHA-256, with at least one
// letter so a long date or build number is left alone), alone or after `package@`, cut to its first seven like Git does.
export const releaseName = (version: string) => version.replace(/(^|@)(?=[0-9a-f]*[a-f])([0-9a-f]{7})(?:[0-9a-f]{33}|[0-9a-f]{57})$/i, '$1$2')

// The word for every environment at once, as a filter or a rule's scope.
export const ALL_ENVIRONMENTS = 'All environments'
