export type Cursors = { next?: string; previous?: string }

// GlitchTip 7.0.0 wraps the header in a Python set literal: {'<…>; rel="next"; …'}.
export function parseLinkHeader(header: string | null): Cursors {
  const cursors: Cursors = {}
  if (!header) return cursors
  for (const link of header.replace(/^\{'?|'?\}$/g, '').split(/,\s*(?=<)/)) {
    const rel = link.match(/rel="(next|previous)"/)?.[1] as keyof Cursors | undefined
    if (!rel || !/results="true"/.test(link)) continue
    const cursor = link.match(/cursor="([^"]+)"/)?.[1] ?? link.match(/[?&]cursor=([^&>]+)/)?.[1]
    if (cursor) cursors[rel] = decodeURIComponent(cursor)
  }
  return cursors
}

export type Page<T> = { items: T[]; cursors: Cursors; hits?: number; maxHits?: number }

export function toPage<T>(items: T[], response: Response): Page<T> {
  const number = (name: string) => {
    const value = response.headers.get(name)
    return value === null ? undefined : Number(value)
  }
  return {
    items,
    cursors: parseLinkHeader(response.headers.get('link')),
    hits: number('x-hits'),
    maxHits: number('x-max-hits'),
  }
}
