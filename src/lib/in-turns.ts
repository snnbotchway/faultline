export function inTurns(max: number) {
  let running = 0
  const waiting: (() => void)[] = []
  return async <T>(call: () => Promise<T>): Promise<T> => {
    if (running < max) running++
    else await new Promise<void>((resolve) => waiting.push(resolve))
    try {
      return await call()
    } finally {
      // The slot passes straight to the next call, so a new one cannot jump the queue.
      const next = waiting.shift()
      if (next) next()
      else running--
    }
  }
}
