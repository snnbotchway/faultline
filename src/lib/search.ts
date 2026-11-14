// One or more project ids, as the stock UI writes them: `?project=1&project=2`.
export function projectIds(value: unknown): number[] | undefined {
  const ids = (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(Number).filter(Number.isInteger)
  return ids.length > 0 ? ids : undefined
}
