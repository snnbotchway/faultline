import { useCallback, useState } from 'react'

// How long an element has to stay within reach to count, so a fast scroll past it does not.
const DWELL_MS = 250

/**
 * Whether an element has stayed within a screen's reach for a moment, for work that is only worth doing for what
 * can be seen. Stays true once it has, so scrolling back does not undo it.
 */
export function useSeen<T extends Element>() {
  const [seen, setSeen] = useState(false)
  const ref = useCallback((node: T | null) => {
    if (!node) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer)
        if (!entry?.isIntersecting) return
        timer = setTimeout(() => {
          setSeen(true)
          observer.disconnect()
        }, DWELL_MS)
      },
      { rootMargin: '50% 0px' },
    )
    observer.observe(node)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])
  return [ref, seen] as const
}
