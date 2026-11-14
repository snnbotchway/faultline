import { frameFile, type ExceptionValue, type Frame } from './event'
import { Language } from './highlight'

const line = (frame: Frame) => frame.context?.find(([number]) => number === frame.lineNo)?.[1]?.trim()

function frameText(frame: Frame, platform: string | null | undefined) {
  const file = frameFile(frame)
  const code = line(frame)
  if (platform === Language.python) {
    return [`  File "${file}", line ${frame.lineNo ?? '?'}, in ${frame.function ?? '?'}`, ...(code ? [`    ${code}`] : [])].join('\n')
  }
  const place = [file, frame.lineNo, frame.colNo && frame.colNo > 0 ? frame.colNo : undefined].filter((part) => part != null).join(':')
  return [`    at ${frame.function ?? '?'} (${place})`, ...(code ? [`        ${code}`] : [])].join('\n')
}

/**
 * The trace as plain text to read or paste: the raised exception first, then each one that caused it.
 * `frames` are in the order the screen shows them.
 */
export function rawTrace(exceptions: { exception: ExceptionValue; frames: Frame[] }[], platform: string | null | undefined): string {
  return exceptions
    .map(({ exception, frames }, index) => {
      const head = `${index > 0 ? 'Caused by: ' : ''}${exception.module ? `${exception.module}.` : ''}${exception.type ?? 'Error'}: ${exception.value ?? ''}`
      return [head, ...frames.map((frame) => frameText(frame, platform))].join('\n')
    })
    .join('\n\n')
}
