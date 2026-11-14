// One or more project ids, as the stock UI writes them: `?project=1&project=2`.
export function projectIds(value: unknown): number[] | undefined {
  const ids = (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(Number).filter(Number.isInteger)
  return ids.length > 0 ? ids : undefined
}

// A search parameter as text: the router reads `?q=12` as a number.
export const searchText = (value: unknown) => (typeof value === 'string' && value ? value : typeof value === 'number' ? String(value) : undefined)

// A numeric id. Early links quoted it (`?group=%2211%22`), which the router reads as text.
export function searchId(value: unknown): number | undefined {
  const id = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : undefined
}
