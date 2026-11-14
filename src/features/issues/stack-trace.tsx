import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { frameFile, framesOf, type ExceptionValue, type Frame } from './event'

export function ContextLines({ frame }: { frame: Frame }) {
  if (!frame.context?.length) return null
  return (
    <pre className="mono overflow-x-auto bg-code py-1.5 leading-[1.6]">
      {frame.context.map(([line, text]) => (
        <div key={line} className={cn('flex min-w-max pr-3', line === frame.lineNo && 'bg-hit font-medium')}>
          <span className="w-12 shrink-0 pr-3 text-right text-muted-foreground select-none">{line}</span>
          <span>{text || ' '}</span>
        </div>
      ))}
    </pre>
  )
}

function Vars({ vars }: { vars: Record<string, unknown> }) {
  return (
    <dl className="mono grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 border-t px-3 py-2">
      {Object.entries(vars).map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="text-muted-foreground">{name}</dt>
          <dd className="truncate">{typeof value === 'string' ? value : JSON.stringify(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function FrameRow({ frame, startOpen }: { frame: Frame; startOpen: boolean }) {
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
        <ChevronRight className={cn('size-3.5 shrink-0 transition-transform duration-150', open && 'rotate-90', !detail && 'invisible')} />
        <span className="min-w-0 break-all">
          <span className={cn(frame.inApp && 'font-medium')}>{frameFile(frame)}</span>
          {frame.lineNo != null && <span>:{frame.lineNo}</span>}
          {frame.function && <span className="text-muted-foreground"> in {frame.function}</span>}
        </span>
      </button>
      {open && detail && (
        <div className="border-t">
          <ContextLines frame={frame} />
          {frame.vars && Object.keys(frame.vars).length > 0 && <Vars vars={frame.vars} />}
        </div>
      )}
    </li>
  )
}

// Frames from the app start expanded; runs of library frames fold into one line.
function Frames({ frames }: { frames: Frame[] }) {
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
          run.frames.map((frame, index) => <FrameRow key={run.start + index} frame={frame} startOpen={anyInApp ? run.start + index === firstInApp || !!frame.inApp : run.start + index === 0} />)
        ) : (
          <li key={run.start} className="border-t first:border-t-0">
            <button
              type="button"
              onClick={() => setShown(new Set(shown).add(run.start))}
              className="flex min-h-8 w-full items-center gap-2 px-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground max-lg:min-h-11"
            >
              <ChevronRight className="size-3.5 shrink-0" />
              {run.frames.length} library {run.frames.length === 1 ? 'frame' : 'frames'}
            </button>
          </li>
        ),
      )}
    </ol>
  )
}

export function StackTrace({ exceptions }: { exceptions: ExceptionValue[] }) {
  // The raised exception first, then what caused it.
  const ordered = [...exceptions].reverse()
  return (
    <div className="space-y-4">
      {ordered.map((exception, index) => (
        <div key={index}>
          <p className="mb-2">
            {index > 0 && <span className="text-muted-foreground">caused by </span>}
            <span className="font-mono text-[0.8125rem] font-semibold">{exception.type}</span> <span>{exception.value}</span>
            {exception.mechanism?.handled === false && <span className="label-caps ml-2 text-level-error">unhandled</span>}
          </p>
          <Frames frames={framesOf(exception)} />
        </div>
      ))}
    </div>
  )
}
