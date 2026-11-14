import { Search } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Kbd } from '@/components/ui/kbd'
import { useHotkeys } from '@/lib/hotkeys'
import { cn } from '@/lib/utils'

// A page's search box: Enter applies it, `/` focuses it. Give it `key={query}` so it follows the URL.
export function SearchField({ query, label, onSubmit, className }: { query: string | undefined; label: string; onSubmit: (query: string | undefined) => void; className?: string }) {
  const [text, setText] = useState(query ?? '')
  const input = useRef<HTMLInputElement>(null)
  useHotkeys({
    '/': (event) => {
      event.preventDefault()
      input.current?.focus()
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(text.trim() || undefined)
  }
  return (
    <form onSubmit={submit} role="search" className={cn('flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-3 focus-within:border-foreground max-lg:h-11', className)}>
      <Search className="size-3 shrink-0 text-muted-foreground" />
      <input
        ref={input}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={label}
        aria-label={label}
        spellCheck={false}
        autoCapitalize="off"
        className="mono h-full min-w-0 flex-1 bg-transparent touch-input outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:outline-none"
      />
      <Kbd>/</Kbd>
    </form>
  )
}
