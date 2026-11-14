// `1 issue`, `3 issues`. `count` may already be worded (`1000+`).
export const plural = (count: number | string, one: string, many = `${one}s`) => `${count} ${String(count) === '1' ? one : many}`

// The words of a search box, for matching in any order and case.
export const searchWords = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

// Whether every word appears somewhere in the text.
export const hasWords = (text: string, words: string[]) => {
  const lower = text.toLowerCase()
  return words.every((word) => lower.includes(word))
}

// A release as people say it: a commit hash, alone or after `package@`, cut to its first seven characters like Git does.
export const releaseName = (version: string) => version.replace(/(^|@)([0-9a-f]{7})[0-9a-f]{5,33}$/i, '$1$2')
