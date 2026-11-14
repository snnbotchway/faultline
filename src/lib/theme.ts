import { useSyncExternalStore } from 'react'

export const Theme = { system: 'system', light: 'light', dark: 'dark' } as const
export type Theme = (typeof Theme)[keyof typeof Theme]

// Same key as the stock GlitchTip UI, so a saved choice carries over. public/theme.js reads it before paint.
const KEY = 'theme'
const listeners = new Set<() => void>()
const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  return saved === Theme.light || saved === Theme.dark ? saved : Theme.system
}

function apply() {
  const theme = getTheme()
  const dark = theme === Theme.dark || (theme === Theme.system && prefersDark().matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setTheme(theme: Theme) {
  if (theme === Theme.system) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, theme)
  apply()
  listeners.forEach((listener) => listener())
}

export function useTheme(): Theme {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    prefersDark().addEventListener('change', apply)
    return () => {
      listeners.delete(listener)
      prefersDark().removeEventListener('change', apply)
    }
  }, getTheme)
}
