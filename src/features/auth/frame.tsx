import type { ReactNode } from 'react'
import { Mark } from '@/components/mark'
import { useTitle } from '@/lib/title'

// The page every signed-out screen shares: the mark drawn across it, one title, one column.
export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  useTitle(title)
  return (
    <main className="min-h-dvh pb-16">
      {/* One line that slips where the form begins. Smaller on a phone, so the form starts in the first third of the screen. */}
      <div className="flex items-start pt-28 max-sm:pt-8" aria-hidden>
        <div className="mt-4 h-px flex-1 -translate-y-1/2 bg-border max-sm:mt-3" />
        <Mark className="-mx-1 size-12 max-sm:size-9" />
        <div className="mt-8 h-px flex-1 -translate-y-1/2 bg-border max-sm:mt-6" />
      </div>
      <div className="mx-auto w-full max-w-94 px-4 pt-7 max-sm:pt-4">
        <p className="text-center font-mono text-xs font-semibold tracking-wordmark">FAULTLINE</p>
        <h1 className="mt-10 text-2xl font-semibold text-balance max-sm:mt-7">{title}</h1>
        <div className="mt-5">{children}</div>
      </div>
    </main>
  )
}

// The ways out of a screen, under its form.
export function AuthLinks({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-between gap-x-6 gap-y-2 max-lg:[&>*]:min-h-11">{children}</div>
}

// A fact about the screen that is not an error: "Password changed."
export function AuthNote({ children }: { children: ReactNode }) {
  return (
    <p className="prose-text mb-4 border px-3 py-2" role="status">
      {children}
    </p>
  )
}
