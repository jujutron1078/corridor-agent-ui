"use client"

import { Slider } from "@/components/ui/slider"
import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react"

interface TimeSliderProps {
  years: number[]
  currentYear: number
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onYearChange: (year: number) => void
  dataAvailability: Record<string, number[]>
}

export function TimeSlider({
  years,
  currentYear,
  isPlaying,
  onPlay,
  onPause,
  onYearChange,
  dataAvailability,
}: TimeSliderProps) {
  if (!years.length) return null

  const minYear = years[0]
  const maxYear = years[years.length - 1]
  const currentIndex = years.indexOf(currentYear)

  // Count how many layers have data for each year
  const layerCount = (year: number) =>
    Object.values(dataAvailability).filter((yrs) => yrs.includes(year)).length
  const maxLayers = Object.keys(dataAvailability).length || 1

  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex w-[min(600px,calc(100%-2rem))] -translate-x-1/2 items-center gap-4 rounded-xl bg-black/70 px-5 py-3 backdrop-blur-md">
      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
      </button>

      {/* Current year */}
      <span className="w-12 shrink-0 text-center text-xl font-bold tabular-nums text-white">
        {currentYear}
      </span>

      {/* Slider area */}
      <div className="flex flex-1 flex-col gap-1">
        {/* Data availability dots */}
        <div className="flex justify-between px-0.5">
          {years.map((year) => {
            const density = layerCount(year) / maxLayers
            return (
              <div
                key={year}
                className="h-1 w-1 rounded-full"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${0.2 + density * 0.8})`,
                }}
                title={`${year}: ${layerCount(year)} layers`}
              />
            )
          })}
        </div>

        {/* Slider */}
        <Slider
          min={0}
          max={years.length - 1}
          step={1}
          value={[currentIndex >= 0 ? currentIndex : 0]}
          onValueChange={([idx]) => {
            if (years[idx] !== undefined) onYearChange(years[idx])
          }}
          className="w-full"
        />

        {/* Year labels */}
        <div className="flex justify-between text-[10px] text-white/30">
          <span>{minYear}</span>
          <span>{maxYear}</span>
        </div>
      </div>
    </div>
  )
}
