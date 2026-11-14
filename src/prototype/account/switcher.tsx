// PROTOTYPE, throwaway. The floating bar that flips between variants and screens. It is not part of any design.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { SCREENS, VARIANTS, type ScreenKey, type VariantKey } from './model'

export function PrototypeSwitcher({ variant, screen, onChange }: { variant: VariantKey; screen: ScreenKey; onChange: (next: { variant: VariantKey; screen: ScreenKey }) => void }) {
  const index = VARIANTS.findIndex((item) => item.key === variant)
  const step = (by: number) => onChange({ variant: (VARIANTS[(index + by + VARIANTS.length) % VARIANTS.length] ?? VARIANTS[0]).key, screen })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable], [role="radiogroup"], [role="tablist"]')) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const arrow = 'grid size-8 place-items-center rounded-full hover:bg-white/20'
  return (
    <div
      data-prototype-switcher
      className="fixed bottom-3 left-1/2 z-[100] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 rounded-full bg-[#1b1bd6] px-1.5 py-1 font-sans text-[13px] text-white shadow-[0_8px_24px_-6px_rgb(0_0_0/0.6)] max-lg:bottom-16"
    >
      <button type="button" className={arrow} onClick={() => step(-1)} aria-label="Previous variant">
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-1 font-semibold whitespace-nowrap">
        {variant} <span className="font-normal opacity-80 max-sm:hidden">({VARIANTS[index]?.name})</span>
      </span>
      <button type="button" className={arrow} onClick={() => step(1)} aria-label="Next variant">
        <ChevronRight className="size-4" />
      </button>
      <select
        aria-label="Screen"
        value={screen}
        onChange={(event) => onChange({ variant, screen: event.target.value as ScreenKey })}
        className="mr-1 h-8 max-w-44 min-w-0 rounded-full bg-white/15 px-2 text-white outline-none [&>optgroup]:text-black [&_option]:text-black"
      >
        <optgroup label="Signed out">
          {SCREENS.filter((item) => item.signedOut).map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Profile">
          {SCREENS.filter((item) => !item.signedOut).map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  )
}
