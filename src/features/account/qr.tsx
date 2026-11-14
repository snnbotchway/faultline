import { encode } from 'uqr'

// Always dark on white, in both themes: a phone camera reads nothing else reliably.
export function QrCode({ value, label }: { value: string; label: string }) {
  const { data, size } = encode(value, { border: 2 })
  let path = ''
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y]?.[x]) path += `M${x} ${y}h1v1h-1z`
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="size-44 shrink-0 border bg-white" shapeRendering="crispEdges" role="img" aria-label={label}>
      <path d={path} fill="#000" />
    </svg>
  )
}
