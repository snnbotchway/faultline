// THROWAWAY PROTOTYPE, not a product route. Delete with src/prototype/settings once a variant is picked.
//
// Variants of the organisation and project settings area, switchable with ?variant=a|b|c|d (or ← →), on stub data.
// a, b and c are the first round; d is the picker's mix of them.
// The path after /prototype/settings mirrors the stock path it stands for: /prototype/settings/demo-co/settings/members.
// Run: bun run dev --port 5197, then open http://localhost:5197/prototype/settings
import { createFileRoute, notFound } from '@tanstack/react-router'
import { OrgRole } from '@/prototype/settings/data'
import { ProtoProvider, Switcher, Variant, type ProtoSearch } from '@/prototype/settings/kit'
import { NotFoundScreen, parse } from '@/prototype/settings/screens'
import { VariantA } from '@/prototype/settings/variant-a'
import { VariantB } from '@/prototype/settings/variant-b'
import { VariantC } from '@/prototype/settings/variant-c'
import { VariantD } from '@/prototype/settings/variant-d'

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

export const Route = createFileRoute('/prototype/settings/$')({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw notFound()
  },
  validateSearch: (search: Record<string, unknown>): ProtoSearch => ({
    variant: Object.values(Variant).find((key) => key === search.variant) ?? Variant.a,
    as: Object.values(OrgRole).find((role) => role === search.as),
    tab: text(search.tab),
    open: text(search.open),
    created: text(search.created),
    q: text(search.q),
    email: search.email === 'off' ? 'off' : undefined,
    bar: search.bar === 0 ? 0 : undefined,
  }),
  component: Prototype,
})

const VARIANTS = { a: VariantA, b: VariantB, c: VariantC, d: VariantD }

function Prototype() {
  const { _splat: path = '' } = Route.useParams()
  const search = Route.useSearch()
  const screen = parse(path)
  const Chosen = VARIANTS[search.variant]
  return (
    <ProtoProvider path={path} search={search}>
      {screen ? <Chosen key={search.variant} screen={screen} /> : <NotFoundScreen />}
      <Switcher />
    </ProtoProvider>
  )
}
