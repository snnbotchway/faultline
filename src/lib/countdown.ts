import { useEffect, useState } from 'react'

// Seconds left until something may be done again. `start` begins a new wait.
export function useCountdown(): [number, (seconds: number) => void] {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const timer = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])
  return [left, setLeft]
}
