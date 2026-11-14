// PROTOTYPE, throwaway: do not merge. Delete this route and src/prototype/account/ once a variant is picked.
//
// Four variants of the account and sign-in area on one route, switchable with ?variant=A|B|C|D and ?screen=…,
// on stubbed data in the backend's shapes. Two questions:
//   1. How do sign up, password reset, invite acceptance and the two-step check feel as one family next to /login?
//   2. How is the profile organised, and how do the two-step tasks (authenticator app, security key, new recovery codes) flow?
//
//   A  Ledger: one page       one ruled page, tasks unfold in place; signed-out pages repeat /login
//   B  Tabbed pages           a page per stock path, a task takes over its page; signed-out flows share one box with tabs
//   C  Summary and dialogs    a read-only sheet of facts, every task in a dialog; signed-out choices unfold as rows
//   D  The picked mix         C's sheet and dialogs (bottom sheets on a phone), A's pages signed out, C's inline invite
//
// Run: bun run prototype:account
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { GoContext, SCREENS, VARIANTS, useAccount, type ScreenKey, type VariantKey } from '@/prototype/account/model'
import { SignedOutA, SignedOutB, SignedOutC, SignedOutD } from '@/prototype/account/signed-out'
import { PrototypeSwitcher } from '@/prototype/account/switcher'
import { ProfileA } from '@/prototype/account/variant-a'
import { ProfileB } from '@/prototype/account/variant-b'
import { ProfileC } from '@/prototype/account/variant-c'
import { ProfileD } from '@/prototype/account/variant-d'
import { useTitle } from '@/lib/title'

type Search = { variant: VariantKey; screen: ScreenKey }

export const Route = createFileRoute('/prototype/account')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    variant: VARIANTS.find((item) => item.key === search.variant)?.key ?? 'A',
    screen: SCREENS.find((item) => item.key === search.screen)?.key ?? 'profile',
  }),
  beforeLoad: () => {
    // A stray merge must not ship the prototype.
    if (import.meta.env.PROD) throw notFound()
  },
  component: Prototype,
})

const SIGNED_OUT = { A: SignedOutA, B: SignedOutB, C: SignedOutC, D: SignedOutD }
const PROFILE = { A: ProfileA, B: ProfileB, C: ProfileC, D: ProfileD }

function Profile({ variant, screen }: Search) {
  const account = useAccount(screen)
  const View = PROFILE[variant]
  return <View account={account} />
}

function Prototype() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { variant, screen } = search
  const label = SCREENS.find((item) => item.key === screen)
  useTitle(`${variant} · ${label?.label}`, 'Prototype')
  const change = (next: Search) => void navigate({ search: next, replace: true })
  const SignedOut = SIGNED_OUT[variant]
  return (
    <GoContext value={(next) => change({ variant, screen: next })}>
      {/* Keyed so each screen starts from its own stubbed state. */}
      {label?.signedOut ? <SignedOut key={`${variant}-${screen}`} screen={screen} /> : <Profile key={`${variant}-${screen}`} variant={variant} screen={screen} />}
      <PrototypeSwitcher variant={variant} screen={screen} onChange={change} />
    </GoContext>
  )
}
