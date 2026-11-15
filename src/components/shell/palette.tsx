import { ChevronRight } from 'lucide-react'
import { Dialog as Primitive } from 'radix-ui'
import { useId, useMemo, useState } from 'react'
import { Mark } from '@/components/mark'
import { DialogContent } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { hasWords, searchWords } from '@/lib/text'
import { cn } from '@/lib/utils'
import { CommandGroup, palette, registry, usePaletteOpen, type Command } from './commands'

const GROUP_ORDER: CommandGroup[] = Object.values(CommandGroup)

export function Palette({ onSearch }: { onSearch?: (text: string) => void }) {
  const open = usePaletteOpen()
  return (
    <Primitive.Root open={open} onOpenChange={(next) => (next ? palette.open() : palette.close())}>
      {open && <PaletteContent onSearch={onSearch} />}
    </Primitive.Root>
  )
}

function PaletteContent({ onSearch }: { onSearch?: (text: string) => void }) {
  const [text, setText] = useState('')
  const [cursor, setCursor] = useState(0)
  const id = useId()

  const shown = useMemo(() => {
    const words = searchWords(text)
    const matches = [...registry.values()]
      .flat()
      .filter((command) => hasWords(`${command.group} ${command.label} ${command.detail ?? ''}`, words))
      .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
    if (text.trim() && onSearch) {
      matches.push({ id: 'search', group: CommandGroup.search, label: `Search issues for “${text.trim()}”`, run: () => onSearch(text.trim()) })
    }
    return matches
  }, [text, onSearch])

  // Each run of commands under one heading is a group the heading names; `index` is the command's place in the whole list.
  const groups = useMemo(() => {
    const result: { name: CommandGroup; items: { command: Command; index: number }[] }[] = []
    shown.forEach((command, index) => {
      const last = result[result.length - 1]
      if (last?.name === command.group) last.items.push({ command, index })
      else result.push({ name: command.group, items: [{ command, index }] })
    })
    return result
  }, [shown])

  const run = (command: Command | undefined) => {
    if (!command) return
    palette.close()
    command.run()
  }

  return (
    <DialogContent aria-describedby={undefined} className="top-[12vh] max-w-160 max-lg:top-3">
      <Primitive.Title className="sr-only">Commands</Primitive.Title>
      <div className="flex items-center gap-2 border-b px-3">
        <ChevronRight className="size-4 shrink-0 text-brand" strokeWidth={2.4} aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={`${id}-list`}
          aria-activedescendant={shown[cursor] ? `${id}-${cursor}` : undefined}
          aria-autocomplete="list"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setCursor(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setCursor(Math.min(shown.length - 1, cursor + 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setCursor(Math.max(0, cursor - 1))
            } else if (event.key === 'Enter') run(shown[cursor])
          }}
          placeholder="Run a command or search issues"
          aria-label="Command"
          className="h-12 min-w-0 flex-1 touch-input bg-transparent text-base outline-none placeholder:text-muted-foreground focus-visible:outline-none"
        />
        <Kbd>esc</Kbd>
      </div>
      <div className="max-h-[min(68vh,560px)] overflow-y-auto py-1" id={`${id}-list`} role="listbox" aria-label="Commands">
        {groups.map((group, at) => (
          <div key={group.name} role="group" aria-labelledby={`${id}-group-${at}`}>
            <div id={`${id}-group-${at}`} className="label-caps px-3 pt-3 pb-1">
              {group.name}
            </div>
            {group.items.map(({ command, index }) => (
              // Focus stays in the field; the field's active descendant tells a screen reader which command is current.
              <button
                key={command.id}
                type="button"
                id={`${id}-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={index === cursor}
                onMouseMove={() => setCursor(index)}
                onClick={() => run(command)}
                ref={index === cursor ? (node) => node?.scrollIntoView({ block: 'nearest' }) : undefined}
                className={cn('flex min-h-8 w-full items-center gap-3 px-3 py-1 text-left max-lg:min-h-11', index === cursor && 'bg-accent outline-2 -outline-offset-2 outline-foreground')}
              >
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                {command.detail && <span className="mono shrink-0 text-muted-foreground">{command.detail}</span>}
                {command.keys && <Kbd>{command.keys}</Kbd>}
              </button>
            ))}
          </div>
        ))}
        {shown.length === 0 && <Mark className="mx-auto my-6 size-6 text-muted-foreground" />}
      </div>
    </DialogContent>
  )
}
