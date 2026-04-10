"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export function useTimeAnimation(years: number[], stepIntervalMs = 2000) {
  const [currentYearIndex, setCurrentYearIndex] = useState(years.length - 1)
  const [isPlaying, setIsPlaying] = useState(false)
  const lastStepTime = useRef(0)
  const rafId = useRef<number>(0)

  const animate = useCallback(
    (timestamp: number) => {
      if (timestamp - lastStepTime.current >= stepIntervalMs) {
        lastStepTime.current = timestamp
        setCurrentYearIndex((i) => {
          if (i >= years.length - 1) {
            setIsPlaying(false)
            return i
          }
          return i + 1
        })
      }
      rafId.current = requestAnimationFrame(animate)
    },
    [years.length, stepIntervalMs]
  )

  useEffect(() => {
    if (isPlaying) {
      lastStepTime.current = performance.now()
      rafId.current = requestAnimationFrame(animate)
    }
    return () => cancelAnimationFrame(rafId.current)
  }, [isPlaying, animate])

  return {
    currentYear: years[currentYearIndex] ?? years[years.length - 1],
    currentYearIndex,
    isPlaying,
    play: () => {
      // If at end, restart from beginning
      if (currentYearIndex >= years.length - 1) {
        setCurrentYearIndex(0)
      }
      setIsPlaying(true)
    },
    pause: () => setIsPlaying(false),
    setYear: (year: number) => {
      const idx = years.indexOf(year)
      if (idx !== -1) setCurrentYearIndex(idx)
    },
  }
}
