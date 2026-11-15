import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Segmented } from '@/components/ui/segmented'
import { CopyButton } from '@/features/settings/parts'
import { useT } from '@/i18n'
import { useStoredChoice } from '@/lib/stored'
import { cn } from '@/lib/utils'
import { frameFile, framesOf, valueText, type ExceptionValue, type Frame } from './event'
import { Tone, languageOf, useHighlighted } from './highlight'
import { Pairs, Section } from './issue-sections'
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
  const t = useT().issues
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
          {frame.function && <span className="text-muted-foreground"> {t.sections.in(frame.function)}</span>}
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
  const t = useT().issues
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
              {t.stackTrace.libraryFrames(run.frames.length)}
            </button>
          </li>
        ),
      )}
    </ol>
  )
}

const TraceView = { full: 'full', raw: 'raw' } as const
type TraceView = (typeof TraceView)[keyof typeof TraceView]
const FrameOrder = { newest: 'newest', oldest: 'oldest' } as const
type FrameOrder = (typeof FrameOrder)[keyof typeof FrameOrder]

// Kept per browser, so a reader who prefers the raw trace or the oldest call first gets it on every issue.
const VIEW_KEY = 'faultline-trace-view'
const ORDER_KEY = 'faultline-frame-order'

function Mechanism({ mechanism }: { mechanism: NonNullable<ExceptionValue['mechanism']> }) {
  const t = useT().issues
  const [open, setOpen] = useState(false)
  const { function: caughtIn, ...data } = mechanism.data ?? {}
  const caught = caughtIn == null ? undefined : valueText(caughtIn)
  const extra = Object.entries(data)
  // "onerror" says nothing that "window.onerror" does not.
  const type = mechanism.type && !caught?.includes(mechanism.type) ? mechanism.type : undefined
  const parts = [
    type && { text: type },
    mechanism.handled != null && { text: mechanism.handled ? t.stackTrace.handled : t.stackTrace.unhandled, error: !mechanism.handled },
    caught && { text: caught },
  ].filter((part): part is { text: string; error?: boolean } => !!part)
  if (parts.length === 0 && extra.length === 0 && !mechanism.description) return null
  return (
    <div className="mb-2 text-muted-foreground">
      {(parts.length > 0 || extra.length > 0) && (
        <p className="mono">
          {parts.map((part, index) => (
            <span key={index}>
              {index > 0 && ' · '}
              <span className={part.error ? 'text-level-error' : undefined}>{part.text}</span>
            </span>
          ))}
          {extra.length > 0 && (
            <>
              {parts.length > 0 && ' · '}
              <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1 font-sans text-sm underline decoration-dotted underline-offset-4 hover:text-foreground max-lg:min-h-11">
                {t.sections.more(extra.length)}
              </button>
            </>
          )}
        </p>
      )}
      {open && (
        <div className="mt-1 border-l pl-3">
          <Pairs pairs={extra} />
        </div>
      )}
      {mechanism.description && <p>{mechanism.description}</p>}
    </div>
  )
}

export function StackTrace({ exceptions, platform }: { exceptions: ExceptionValue[]; platform?: string | null }) {
  const t = useT().issues.stackTrace
  const [view, setView] = useStoredChoice(VIEW_KEY, Object.values(TraceView), TraceView.full)
  const [order, setOrder] = useStoredChoice(ORDER_KEY, Object.values(FrameOrder), FrameOrder.newest)
  // The raised exception first, then what caused it.
  const ordered = [...exceptions].reverse().map((exception) => ({ exception, frames: order === FrameOrder.newest ? framesOf(exception) : (exception.stacktrace?.frames ?? []) }))
  const views = [
    { value: TraceView.full, label: t.views.full },
    { value: TraceView.raw, label: t.views.raw },
  ]
  const orders = [
    { value: FrameOrder.newest, label: t.orders.newest },
    { value: FrameOrder.oldest, label: t.orders.oldest },
  ]
  const raw = view === TraceView.raw ? rawTrace(ordered, platform) : undefined
  return (
    <Section
      title={t.title}
      actions={
        <>
          {raw !== undefined && <CopyButton text={raw} />}
          <Segmented label={t.view} value={view} options={views} onChange={setView} />
          <Segmented label={t.order} value={order} options={orders} onChange={setOrder} />
        </>
      }
    >
      {raw !== undefined ? (
        <pre className="mono overflow-x-auto border bg-code p-3 leading-code">{raw}</pre>
      ) : (
        <div className="space-y-4">
          {ordered.map(({ exception, frames }, index) => (
            <div key={index}>
              <p className="mb-2">
                {index > 0 && <span className="text-muted-foreground">{t.causedBy}</span>}
                <span className="error-type">{exception.type}</span> <span>{exception.value}</span>
              </p>
              {exception.mechanism && <Mechanism mechanism={exception.mechanism} />}
              {/* Which frames are open is kept by position, so a new order starts afresh. */}
              <Frames key={order} frames={frames} platform={platform} />
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
