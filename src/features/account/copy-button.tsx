import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'

const SHOWN_FOR = 2000

// Copies `text` and says so on the button itself.
export function CopyButton({ text, label, variant = 'outline', className }: { text: string; label?: string; variant?: 'outline' | 'default'; className?: string }) {
  const [copied, setCopied] = useState(false)
  const t = useT()
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), SHOWN_FOR)
  }
  return (
    <Button variant={variant} className={cn('max-lg:h-11', className)} onClick={() => void copy()}>
      {copied ? <Check /> : <Copy />}
      <span aria-live="polite">{copied ? t.common.copied : (label ?? t.common.copy)}</span>
    </Button>
  )
}
