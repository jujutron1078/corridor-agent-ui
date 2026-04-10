"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useTimeAnimation } from "./_components/use-time-animation"
import { KpiSidebar } from "./_components/kpi-sidebar"
import { TimeSlider } from "./_components/time-slider"
import { NodeDetailPanel } from "./_components/node-detail-panel"
import { LayerControls } from "./_components/layer-controls"
import { StoryGuide, StoryGuideButton } from "./_components/story-guide"

const PulseMap = dynamic(() => import("./_components/pulse-map").then((m) => m.PulseMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black text-white/40">
      Loading map...
    </div>
  ),
})

export interface DashboardSnapshot {
  year: number
  corridor: {
    nodes: { name: string; lon: number; lat: number }[]
    countries: string[]
    country_names: Record<string, string>
    buffer_km: number
    centerline: [number, number][]
    aoi_geojson: Record<string, unknown>
  }
  trade_arcs: {
    source: [number, number]
    target: [number, number]
    commodity: string
    value_usd: number
    year: number
    flow: string
    processing_stage?: string
    weight_kg?: number
    reporter_name?: string
    target_name?: string
  }[]
  investments: {
    position: [number, number]
    name: string
    sector: string
    cost_usd: number | null
    status: string
    year: number | null
    financier: string | null
  }[]
  conflict_events: {
    position: [number, number]
    fatalities: number
    event_type: string
    date: string
  }[]
  kpis: {
    label: string
    value: number | null
    unit: string
    trend: number[]
    trend_years: number[]
    country: string | null
  }[]
  nightlights_tile_url: string | null
  data_availability: Record<string, number[]>
}

export type LayerVisibility = {
  nightlights: boolean
  tradeFlows: boolean
  investments: boolean
  conflict: boolean
  corridor: boolean
  nodes: boolean
}

const DEFAULT_LAYERS: LayerVisibility = {
  nightlights: true,
  tradeFlows: true,
  investments: true,
  conflict: true,
  corridor: true,
  nodes: true,
}

function DashboardInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [data, setData] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return true
    return !localStorage.getItem("corridor:dashboard:story-seen")
  })

  // Layer visibility from URL or localStorage
  const [layers, setLayers] = useState<LayerVisibility>(() => {
    if (typeof window === "undefined") return DEFAULT_LAYERS
    const saved = localStorage.getItem("corridor:dashboard:layers")
    if (saved) {
      try {
        return { ...DEFAULT_LAYERS, ...JSON.parse(saved) }
      } catch {
        return DEFAULT_LAYERS
      }
    }
    return DEFAULT_LAYERS
  })

  // Available years (derived from data)
  const availableYears = data?.data_availability
    ? Array.from(
        new Set(Object.values(data.data_availability).flat())
      ).sort()
    : Array.from({ length: 11 }, (_, i) => 2015 + i)

  // Default year from URL or latest available
  const initialYear = searchParams.get("year")
    ? parseInt(searchParams.get("year")!, 10)
    : availableYears[availableYears.length - 1] ?? 2024

  const { currentYear, isPlaying, play, pause, setYear } = useTimeAnimation(
    availableYears,
    2000
  )

  // Set initial year from URL on mount
  useEffect(() => {
    if (initialYear && availableYears.includes(initialYear)) {
      setYear(initialYear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch data when year changes
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/snapshot?year=${currentYear}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API returned ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [currentYear])

  // Persist layers to localStorage
  useEffect(() => {
    localStorage.setItem("corridor:dashboard:layers", JSON.stringify(layers))
  }, [layers])

  // Update URL when year changes (shallow)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", String(currentYear))
    router.replace(`/dashboard?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear])

  const handleLayerToggle = useCallback((key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <div className="relative h-full w-full">
      {/* Back button */}
      <button
        onClick={() => router.push("/overview")}
        className="absolute top-4 left-4 z-50 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-md hover:bg-white/20 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Back
      </button>

      {/* Map */}
      <PulseMap
        data={data}
        layers={layers}
        loading={loading}
        onNodeClick={setSelectedNode}
      />

      {/* KPI Sidebar */}
      <KpiSidebar kpis={data?.kpis ?? []} loading={loading} />

      {/* Time Slider */}
      <TimeSlider
        years={availableYears}
        currentYear={currentYear}
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
        onYearChange={setYear}
        dataAvailability={data?.data_availability ?? {}}
      />

      {/* Layer Controls */}
      <LayerControls layers={layers} onToggle={handleLayerToggle} />

      {/* Node Detail Panel */}
      {selectedNode && data && (
        <NodeDetailPanel
          nodeName={selectedNode}
          corridor={data.corridor}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Story guide (first visit) */}
      {showGuide && (
        <StoryGuide
          onLayerChange={setLayers}
          defaultLayers={DEFAULT_LAYERS}
          onDismiss={() => setShowGuide(false)}
        />
      )}

      {/* Replay guide button (after dismissal) */}
      {!showGuide && (
        <StoryGuideButton
          onClick={() => {
            localStorage.removeItem("corridor:dashboard:story-seen")
            setShowGuide(true)
          }}
        />
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-lg bg-red-900/80 px-4 py-2 text-sm text-white backdrop-blur-sm">
          Dashboard data unavailable: {error}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-black text-white/40">
          Loading dashboard...
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  )
}
