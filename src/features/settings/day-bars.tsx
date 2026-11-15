import { useRef, type PointerEvent } from 'react'
import { barHeights } from '@/features/issues/trend'
import { cn } from '@/lib/utils'
import { dayAt } from './usage'

// A finger has to travel this far sideways before it is dragging across the days rather than tapping one.
const DRAG_START_PX = 8

export type DayPick = { picked: number | undefined; hover: (index: number | undefined) => void; pin: (index: number, toggle: boolean) => void }

/**
 * Counts per day as bars on the shared 30-day axis. With `pick` a mouse shows the day under it and a click keeps it;
 * a finger keeps the day it taps or drags to, and the page still scrolls up and down under it. Without, it only draws.
 * Unlike `LogHistogram`'s button per bar, the chart takes the pointer as a whole: a day is a few pixels wide on a phone,
 * too narrow to tap, and the keyboard steps through days with the arrow keys and the header's chevrons instead.
 */
export function DayBars({ label, buckets, height, peak, picked, pick, className }: { label: string; buckets: number[]; height: number; peak?: number; picked: number | undefined; pick?: DayPick; className?: string }) {
  const touchStart = useRef<number>(undefined)
  const heights = barHeights(buckets, height, peak)
  const at = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return dayAt(event.clientX, box.left, box.width, buckets.length)
  }
  const mouse = (event: PointerEvent) => event.pointerType === 'mouse'
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex items-end gap-px border-b border-grid', pick && 'cursor-pointer touch-pan-y', className)}
      style={{ height: height + 1 }}
      {...(pick && {
        // A click here picks a day; it must not also fold the row the chart sits in.
        onClick: (event) => event.stopPropagation(),
        onPointerDown: (event) => {
          if (!mouse(event)) touchStart.current = event.clientX
        },
        onPointerMove: (event) => {
          if (mouse(event)) pick.hover(at(event))
          else if (touchStart.current !== undefined && Math.abs(event.clientX - touchStart.current) > DRAG_START_PX) pick.pin(at(event), false)
        },
        onPointerUp: (event) => {
          if (mouse(event)) pick.pin(at(event), true)
          else if (touchStart.current !== undefined) pick.pin(at(event), false)
          touchStart.current = undefined
        },
        // The browser took the gesture to scroll the page.
        onPointerCancel: () => (touchStart.current = undefined),
        onPointerLeave: () => pick.hover(undefined),
      })}
    >
      {heights.map((barHeight, index) => (
        // Only a chart that picks draws the band: on a short trace without one it reads as a second bar stacked on the day's.
        <span key={index} className={cn('flex h-full min-w-0 flex-1 items-end', pick && picked === index && 'bg-selected')}>
          <span className={cn('w-full', picked === index ? 'bg-foreground' : 'bg-foreground/50', picked !== undefined && picked !== index && 'dimmed')} style={{ height: barHeight }} />
        </span>
      ))}
    </div>
  )
}
