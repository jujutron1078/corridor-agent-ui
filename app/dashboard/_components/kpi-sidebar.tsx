"use client"

import { KpiCard } from "./kpi-card"

interface KpiSidebarProps {
  kpis: {
    label: string
    value: number | null
    unit: string
    trend: number[]
    trend_years: number[]
    country: string | null
  }[]
  loading: boolean
}

export function KpiSidebar({ kpis, loading }: KpiSidebarProps) {
  // Show skeleton cards while loading
  const cards = loading || kpis.length === 0
    ? Array.from({ length: 5 }, (_, i) => ({
        label: ["GDP Growth", "FDI Inflows", "Trade Volume", "Conflict Events", "Infrastructure Score"][i],
        value: null,
        unit: "",
        trend: [],
        trend_years: [],
      }))
    : kpis

  return (
    <div className="absolute left-4 top-4 z-20 flex w-64 flex-col gap-2 rounded-xl bg-black/70 p-3 backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">Corridor Pulse</h2>
        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
          LIVE
        </span>
      </div>
      {cards.map((kpi) => (
        <KpiCard
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          unit={kpi.unit}
          trend={kpi.trend}
          trendYears={kpi.trend_years}
          loading={loading}
        />
      ))}
    </div>
  )
}
