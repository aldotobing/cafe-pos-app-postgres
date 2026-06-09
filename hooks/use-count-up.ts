import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration = 1600, decimals = 2) {
  const [displayed, setDisplayed] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const from = useRef(0)

  useEffect(() => {
    const startVal = from.current
    const diff = target - startVal

    if (diff === 0) return

    const steps = Math.max(Math.round(duration / 25), 1)
    const increment = diff / steps
    const precision = Math.pow(10, decimals)
    let step = 0

    timer.current = setInterval(() => {
      step++
      if (step >= steps) {
        setDisplayed(target)
        from.current = target
        if (timer.current) clearInterval(timer.current)
      } else {
        const raw = startVal + increment * step
        setDisplayed(Math.round(raw * precision) / precision)
      }
    }, duration / steps)

    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [target, duration, decimals])

  return displayed
}

export function useCountUpFormatted(
  target: number,
  formatter: (n: number) => string,
  duration = 2000
) {
  const value = useCountUp(target, duration, 2)
  return formatter(value)
}
