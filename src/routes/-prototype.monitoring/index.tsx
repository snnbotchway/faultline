// PROTOTYPE, throwaway: delete this folder, src/routes/prototype.monitoring.tsx and the hook in
// src/routes/_app/$org/$section/route.tsx when a variant has been picked.
//
// Three variants of uptime monitors, status pages, alert rules and releases, switchable with
// ?variant=a|b|c, mounted on the real /:org/... paths so they sit inside the app shell.
// Data is stubbed in the backend's shapes (data.ts); nothing is saved.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { Screen } from '@/components/shell/app-shell'
import { NotBuilt } from '@/components/shell/not-built'
import { useTitle } from '@/lib/title'
import { RELEASES, monitorById, releaseByVersion, type Monitor, type Release } from './data'
import { VARIANTS, useProto } from './shared'
import { VariantA } from './variant-a'
import { VariantB } from './variant-b'
import { VariantC } from './variant-c'

export const PROTOTYPE_SECTIONS = ['uptime-monitors', 'alerts', 'releases', 'settings']

type Base = { to: string; search: Record<string, string | undefined> }
export type ScreenProps =
  | { screen: 'uptime' }
  | { screen: 'monitor'; monitor: Monitor; tab: string }
  | { screen: 'monitor-form'; monitor?: Monitor }
  | { screen: 'status-pages' }
  | { screen: 'alerts'; project?: string; alert?: string; base: Base }
  | { screen: 'releases' }
  | { screen: 'release'; release: Release }

function resolve(path: string[], params: URLSearchParams): ScreenProps | 'not-found' | 'not-built' {
  const [section, first, second, third] = path
  if (section === 'uptime-monitors') {
    if (!first) return { screen: 'uptime' }
    if (first === 'new') return { screen: 'monitor-form' }
    if (first === 'status-pages') return { screen: 'status-pages' }
    const monitor = monitorById(Number(first))
    if (!monitor) return 'not-found'
    return second === 'update' ? { screen: 'monitor-form', monitor } : { screen: 'monitor', monitor, tab: params.get('tab') ?? 'overview' }
  }
  if (section === 'alerts') return { screen: 'alerts', project: params.get('project') ?? undefined, alert: params.get('alert') ?? undefined, base: { to: 'alerts', search: {} } }
  // The stock home of alert rules: /:org/settings/projects/:slug?tab=alerts&alert=new|<id>.
  if (section === 'settings' && first === 'projects' && second && !third && params.get('tab') === 'alerts')
    return { screen: 'alerts', project: second, alert: params.get('alert') ?? undefined, base: { to: `settings/projects/${second}`, search: { tab: 'alerts' } } }
  if (section === 'releases') {
    if (!first) return { screen: 'releases' }
    const release = releaseByVersion(path.slice(1).join('/'))
    return release ? { screen: 'release', release } : 'not-found'
  }
  return 'not-built'
}

const JUMPS = [
  { label: 'Uptime list', to: 'uptime-monitors' },
  { label: 'Monitor', to: 'uptime-monitors/3' },
  { label: 'New monitor', to: 'uptime-monitors/new' },
  { label: 'Status pages', to: 'uptime-monitors/status-pages' },
  { label: 'Alert rules', to: 'alerts' },
  { label: 'Alert editor', to: 'alerts', search: { alert: '3', project: 'payments-api' } },
  { label: 'Alerts (stock URL)', to: 'settings/projects/web-app', search: { tab: 'alerts' } },
  { label: 'Releases', to: 'releases' },
  { label: 'Release', to: `releases/${RELEASES[1]!.version}` },
]

function Switcher() {
  const { variant, params, path, go } = useProto()
  const index = VARIANTS.findIndex((v) => v.key === variant)
  const step = (by: number) => {
    const next = new URLSearchParams(params)
    next.set('variant', VARIANTS[(index + by + VARIANTS.length) % VARIANTS.length]!.key)
    window.history.replaceState(null, '', `${window.location.pathname}?${next}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  if (!import.meta.env.DEV || params.get('bar') === '0') return null
  return (
    <div className="fixed bottom-3 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#1d2bff] py-1 pr-1.5 pl-1 font-sans text-[13px] text-white shadow-[0_8px_24px_-6px_rgb(0_0_0/0.6)] max-lg:bottom-16">
      <button type="button" aria-label="Previous variant" onClick={() => step(-1)} className="grid size-7 place-items-center rounded-full hover:bg-white/20">
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-1 font-semibold whitespace-nowrap">
        {variant.toUpperCase()} ({VARIANTS[index]!.name})
      </span>
      <button type="button" aria-label="Next variant" onClick={() => step(1)} className="grid size-7 place-items-center rounded-full hover:bg-white/20">
        <ChevronRight className="size-4" />
      </button>
      <select
        aria-label="Screen"
        value=""
        onChange={(event) => {
          const jump = JUMPS[Number(event.target.value)]
          if (jump) go(jump.to, jump.search)
        }}
        className="h-7 max-w-28 cursor-pointer rounded-full bg-white/15 px-2 text-white outline-none"
      >
        <option value="">/{path.join('/')}</option>
        {JUMPS.map((jump, at) => (
          <option key={jump.label} value={at} className="text-black">
            {jump.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function MonitoringPrototype() {
  const { path, params, variant } = useProto()
  const screen = resolve(path, params)
  useTitle(typeof screen === 'string' ? undefined : 'Prototype')
  if (screen === 'not-built') return <NotBuilt name="Settings" />
  const Variant = variant === 'b' ? VariantB : variant === 'c' ? VariantC : VariantA
  return (
    <>
      {screen === 'not-found' ? <Screen title="Nothing at this address" /> : <Variant {...screen} />}
      <Switcher />
    </>
  )
}
