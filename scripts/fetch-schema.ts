// Refreshes the vendored GlitchTip and allauth OpenAPI schemas from a running backend,
// then regenerates their TypeScript types. Usage: bun scripts/fetch-schema.ts [backendUrl]
import { $ } from 'bun'

// Example values (sample tokens, TOTP secrets) add nothing to the types and trip secret scanners.
function dropExamples(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(dropExamples)
  if (node === null || typeof node !== 'object') return node
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => key !== 'example' && key !== 'examples')
      .map(([key, value]) => [key, dropExamples(value)]),
  )
}

const base = process.argv[2] ?? 'http://localhost:8600'
const dir = 'src/api/schema'
for (const [name, path] of [['openapi', '/api/openapi.json'], ['allauth', '/_allauth/openapi.json']]) {
  const res = await fetch(base + path)
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  await Bun.write(`${dir}/${name}.json`, JSON.stringify(dropExamples(await res.json()), null, 2) + '\n')
  await $`bunx --bun openapi-typescript ${dir}/${name}.json -o ${dir}/${name}.d.ts`
}
