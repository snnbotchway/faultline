import { useCallback, useState } from 'react'

/**
 * Whether an element has come within a screen's reach, for work that is only worth doing for what can be seen.
 * Stays true once it has, so scrolling back does not undo it.
 */
export function useSeen<T extends Element>() {
  const [seen, setSeen] = useState(false)
  const ref = useCallback((node: T | null) => {
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setSeen(true)
        observer.disconnect()
      },
      { rootMargin: '50% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, seen] as const
}
