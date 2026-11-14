import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Segmented } from '@/components/ui/segmented'
import { cn } from '@/lib/utils'
import { frameFile, framesOf, valueText, type ExceptionValue, type Frame } from './event'
import { Tone, languageOf, useHighlighted } from './highlight'
import { rawTrace } from './raw-trace'

const TONE_CLASS: Record<Tone, string> = { keyword: 'font-semibold', value: 'text-level-info', comment: 'text-muted-foreground' }

export function ContextLines({ frame, platform }: { frame: Frame; platform?: string | null }) {
  const context = frame.context
  const coloured = useHighlighted(context?.map(([, text]) => text) ?? [], languageOf(frame.filename ?? frame.absPath, platform))
  if (!context?.length) return null
  return (
    <pre className="mono overflow-x-auto bg-code py-2 leading-code">
      {context.map(([line, text], index) => (
        <div key={line} className={cn('flex min-w-max pr-3', line === frame.lineNo && 'bg-hit font-medium')}>
          <span className="w-12 shrink-0 pr-3 text-right text-muted-foreground select-none">{line}</span>
          <span>
            {coloured?.[index]?.length
              ? coloured[index].map((piece, at) => (
                  <span key={at} className={piece.tone && TONE_CLASS[piece.tone]}>
                    {piece.text}
                  </span>
                ))
              : text || ' '}
          </span>
        </div>
      ))}
    </pre>
  )
}

function Vars({ vars }: { vars: Record<string, unknown> }) {
  return (
    <dl className="mono grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 border-t px-3 py-2">
      {Object.entries(vars).map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="text-muted-foreground">{name}</dt>
          <dd className="truncate">{valueText(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function FrameRow({ frame, startOpen, platform }: { frame: Frame; startOpen: boolean; platform?: string | null }) {
  const [open, setOpen] = useState(startOpen)
  const detail = !!frame.context?.length || (frame.vars && Object.keys(frame.vars).length > 0)
  return (
    <li className="border-t first:border-t-0">
      <button
        type="button"
        disabled={!detail}
        onClick={() => setOpen(!open)}
        aria-expanded={detail ? open : undefined}
        className={cn('mono flex min-h-8 w-full items-center gap-2 px-2 py-1 text-left max-lg:min-h-11 disabled:cursor-default', detail && 'hover:bg-accent', !frame.inApp && 'text-muted-foreground')}
      >
        <ChevronRight className={cn('size-3 shrink-0 transition-transform duration-150', open && 'rotate-90', !detail && 'invisible')} />
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <span className={cn(frame.inApp && 'font-medium')}>{frameFile(frame)}</span>
          {frame.lineNo != null && <span>:{frame.lineNo}</span>}
          {frame.function && <span className="text-muted-foreground"> in {frame.function}</span>}
        </span>
      </button>
      {open && detail && (
        <div className="border-t">
          <ContextLines frame={frame} platform={platform} />
          {frame.vars && Object.keys(frame.vars).length > 0 && <Vars vars={frame.vars} />}
        </div>
      )}
    </li>
  )
}

// Frames from the app start expanded; runs of library frames fold into one line.
function Frames({ frames, platform }: { frames: Frame[]; platform?: string | null }) {
  const [shown, setShown] = useState<Set<number>>(new Set())
  const runs: { inApp: boolean; start: number; frames: Frame[] }[] = []
  frames.forEach((frame, index) => {
    const last = runs.at(-1)
    if (last && last.inApp === !!frame.inApp) last.frames.push(frame)
    else runs.push({ inApp: !!frame.inApp, start: index, frames: [frame] })
  })
  const anyInApp = frames.some((frame) => frame.inApp)
  const firstInApp = frames.findIndex((frame) => frame.inApp)
  return (
    <ol className="border">
      {runs.map((run) =>
        run.inApp || !anyInApp || shown.has(run.start) ? (
          run.frames.map((frame, index) => <FrameRow key={run.start + index} frame={frame} platform={platform} startOpen={anyInApp ? run.start + index === firstInApp || !!frame.inApp : run.start + index === 0} />)
        ) : (
          <li key={run.start} className="border-t first:border-t-0">
            <button
              type="button"
              onClick={() => setShown(new Set(shown).add(run.start))}
              className="flex min-h-8 w-full items-center gap-2 px-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground max-lg:min-h-11"
            >
              <ChevronRight className="size-3 shrink-0" />
              {run.frames.length} library {run.frames.length === 1 ? 'frame' : 'frames'}
            </button>
          </li>
        ),
      )}
    </ol>
  )
}

const VIEWS = [
  { value: 'full', label: 'Full' },
  { value: 'raw', label: 'Raw' },
] as const
const ORDERS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
] as const

// What an exception says about how it was caught.
function Mechanism({ mechanism }: { mechanism: NonNullable<ExceptionValue['mechanism']> }) {
  const parts = [mechanism.type, mechanism.handled == null ? undefined : mechanism.handled ? 'handled' : 'unhandled', mechanism.data?.function].filter(Boolean)
  if (parts.length === 0) return null
  return (
    <p className="mono mb-2 text-muted-foreground">
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 && ' · '}
          <span className={part === 'unhandled' ? 'text-level-error' : undefined}>{part}</span>
        </span>
      ))}
    </p>
  )
}

export function StackTrace({ exceptions, platform }: { exceptions: ExceptionValue[]; platform?: string | null }) {
  const [view, setView] = useState<(typeof VIEWS)[number]['value']>('full')
  const [order, setOrder] = useState<(typeof ORDERS)[number]['value']>('newest')
  // The raised exception first, then what caused it.
  const ordered = [...exceptions].reverse().map((exception) => ({ exception, frames: order === 'newest' ? framesOf(exception) : (exception.stacktrace?.frames ?? []) }))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="View" value={view} options={VIEWS} onChange={setView} />
        <Segmented label="Frame order" value={order} options={ORDERS} onChange={setOrder} />
      </div>
      {view === 'raw' ? (
        <pre className="mono overflow-x-auto border bg-code p-3 leading-code">{rawTrace(ordered, platform)}</pre>
      ) : (
        ordered.map(({ exception, frames }, index) => (
          <div key={index}>
            <p className="mb-2">
              {index > 0 && <span className="text-muted-foreground">caused by </span>}
              <span className="error-type">{exception.type}</span> <span>{exception.value}</span>
            </p>
            {exception.mechanism && <Mechanism mechanism={exception.mechanism} />}
            <Frames frames={frames} platform={platform} />
          </div>
        ))
      )}
    </div>
  )
}
