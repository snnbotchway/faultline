import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const COPIED_FOR = 1500

// Machine text the user pastes elsewhere. It wraps, so all of it is on screen, and copies with one tap.
export function CopyField({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FOR)
    })
  return (
    <div className={cn('flex items-stretch border bg-code', className)}>
      <code aria-label={label} className="mono min-w-0 flex-1 px-3 py-2 leading-normal [overflow-wrap:anywhere] max-lg:py-3">
        {value}
      </code>
      <button type="button" onClick={copy} className="flex shrink-0 cursor-pointer items-center gap-2 border-l bg-card px-3 text-sm font-medium -outline-offset-2 hover:bg-accent">
        {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  )
}
