import { useEffect } from 'react'

export function useTitle(...parts: (string | undefined)[]) {
  const title = [...parts.filter(Boolean), 'Faultline'].join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}
