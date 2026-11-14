import { useEffect, useState } from 'react'

// Colours code with highlight.js, which loads only when a frame is opened. Each language is its own small chunk
// (1 to 7 kB gzipped), loaded the first time a frame in it shows.
type Grammar = () => Promise<{ default: (hljs: never) => unknown }>
const GRAMMARS: Record<string, Grammar> = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  python: () => import('highlight.js/lib/languages/python'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  php: () => import('highlight.js/lib/languages/php'),
  java: () => import('highlight.js/lib/languages/java'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  go: () => import('highlight.js/lib/languages/go'),
  rust: () => import('highlight.js/lib/languages/rust'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  swift: () => import('highlight.js/lib/languages/swift'),
}

const EXTENSIONS: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', tsx: 'typescript', mts: 'typescript',
  py: 'python', rb: 'ruby', php: 'php', java: 'java', kt: 'kotlin', go: 'go', rs: 'rust', cs: 'csharp', swift: 'swift',
}
const PLATFORMS: Record<string, string> = { node: 'javascript', 'javascript-react': 'javascript', csharp: 'csharp' }

// The file's extension says more than the event's platform (a `.ts` frame in a `javascript` event), so it goes first.
export function languageOf(filename: string | null | undefined, platform: string | null | undefined): string | undefined {
  const extension = filename?.split(/[?#]/)[0]?.split('.').at(-1)?.toLowerCase()
  const byFile = extension ? EXTENSIONS[extension] : undefined
  if (byFile) return byFile
  const named = platform ? (PLATFORMS[platform] ?? platform) : undefined
  return named && named in GRAMMARS ? named : undefined
}

export const Tone = { keyword: 'keyword', value: 'value', comment: 'comment' } as const
export type Tone = (typeof Tone)[keyof typeof Tone]
export type Piece = { text: string; tone?: Tone }

const TONES: Record<string, Tone> = {
  keyword: Tone.keyword,
  literal: Tone.keyword,
  type: Tone.keyword,
  string: Tone.value,
  regexp: Tone.value,
  number: Tone.value,
  symbol: Tone.value,
  comment: Tone.comment,
  doctag: Tone.comment,
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'" }

// highlight.js escapes the code and marks tokens with nested `<span class="hljs-kind">`. A token that runs over
// several lines, such as a block comment, keeps its tone on each of them.
export function piecesOf(html: string): Piece[][] {
  const lines: Piece[][] = [[]]
  const stack: (Tone | undefined)[] = []
  for (const [part, kind] of [...html.matchAll(/<span class="hljs-([\w-]+)[^"]*">|<\/span>|[^<]+/g)].map((match) => [match[0], match[1]] as const)) {
    if (kind) stack.push(TONES[kind] ?? stack.at(-1))
    else if (part === '</span>') stack.pop()
    else {
      const text = part.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity]!)
      text.split('\n').forEach((chunk, index) => {
        if (index > 0) lines.push([])
        if (chunk) lines.at(-1)!.push({ text: chunk, tone: stack.at(-1) })
      })
    }
  }
  return lines
}

type Core = typeof import('highlight.js/lib/core').default
let core: Promise<Core> | undefined
const registered = new Set<string>()

async function highlighter(language: string): Promise<Core | undefined> {
  const grammar = GRAMMARS[language]
  if (!grammar) return undefined
  core ??= import('highlight.js/lib/core').then((module) => module.default)
  const [hljs, definition] = await Promise.all([core, grammar()])
  if (!registered.has(language)) {
    hljs.registerLanguage(language, definition.default as never)
    registered.add(language)
  }
  return hljs
}

// The lines coloured, once highlight.js and the language have loaded; until then (and for a language it does not know) `undefined`.
export function useHighlighted(lines: string[], language: string | undefined): Piece[][] | undefined {
  const [done, setDone] = useState<{ source: string; pieces: Piece[][] }>()
  const source = `${language}\n${lines.join('\n')}`
  useEffect(() => {
    if (!language) return
    let current = true
    void highlighter(language).then((hljs) => {
      if (!current || !hljs) return
      setDone({ source, pieces: piecesOf(hljs.highlight(lines.join('\n'), { language, ignoreIllegals: true }).value) })
    })
    return () => {
      current = false
    }
    // `source` stands for `lines` and `language`.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [source])
  return done?.source === source ? done.pieces : undefined
}
