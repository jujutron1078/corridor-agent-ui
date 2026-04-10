"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { IconPlant2, IconWorld, IconSeeding } from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

import { StatCard } from "@/components/dashboard/stat-card"
import { CountryFilter, type CorridorCountry } from "@/components/dashboard/country-filter"
import { DataTable } from "@/components/dashboard/data-table"
import { ChartWrapper } from "@/components/dashboard/chart-wrapper"
import { DataFreshness } from "@/components/dashboard/data-freshness"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"]

interface CropRecord {
  country: string
  crop: string
  year: number
  typical_yield_t_ha: number | null
  export_volume_tons: number | null
  export_value_usd: number | null
  post_harvest_losses_pct: number | null
  certifications: string | string[] | null
  major_export_markets?: string | string[]
  [key: string]: unknown
}

interface AgSummaryCountry {
  ag_gdp_share_pct?: number
  [key: string]: unknown
}

interface AgSummary {
  total_records: number
  countries: string[]
  crops: string[]
  by_country: Record<string, AgSummaryCountry>
}

const CROPS_COLUMNS = [
  { key: "crop", label: "Crop" },
  { key: "country", label: "Country" },
  {
    key: "typical_yield_t_ha",
    label: "Yield (t/ha)",
    render: (item: Record<string, unknown>) =>
      item.typical_yield_t_ha != null
        ? Number(item.typical_yield_t_ha).toFixed(2)
        : "N/A",
  },
  {
    key: "post_harvest_losses_pct",
    label: "Post-Harvest Loss (%)",
    render: (item: Record<string, unknown>) =>
      item.post_harvest_losses_pct != null
        ? `${item.post_harvest_losses_pct}%`
        : "N/A",
  },
]

const TRADE_COLUMNS = [
  { key: "crop", label: "Crop" },
  { key: "country", label: "Country" },
  {
    key: "export_volume_tons",
    label: "Export Volume (t)",
    render: (item: Record<string, unknown>) =>
      item.export_volume_tons != null
        ? Number(item.export_volume_tons).toLocaleString()
        : "N/A",
  },
  {
    key: "export_value_usd",
    label: "Export Value (USD)",
    render: (item: Record<string, unknown>) =>
      item.export_value_usd != null
        ? `$${Number(item.export_value_usd).toLocaleString()}`
        : "N/A",
  },
  {
    key: "major_export_markets",
    label: "Export Markets",
    render: (item: Record<string, unknown>) => {
      const m = item.major_export_markets
      if (!m) return "N/A"
      const arr = Array.isArray(m) ? m : String(m).split(",")
      return (
        <div className="flex flex-wrap gap-1">
          {arr.slice(0, 3).map((mk: string) => (
            <Badge key={mk} variant="secondary" className="text-xs">
              {mk.trim()}
            </Badge>
          ))}
        </div>
      )
    },
  },
]

export default function AgriculturePage() {
  const [summary, setSummary] = useState<AgSummary | null>(null)
  const [crops, setCrops] = useState<CropRecord[] | null>(null)
  const [country, setCountry] = useState<CorridorCountry>("all")

  useEffect(() => {
    fetch("/api/agriculture-enriched/summary")
      .then((r) => r.json())
      .then(setSummary)
      .catch(console.error)
  }, [])

  useEffect(() => {
    const url =
      country === "all"
        ? "/api/agriculture-enriched/crops"
        : `/api/agriculture-enriched/crops?country=${country}`
    fetch(url)
      .then((r) => r.json())
      .then(setCrops)
      .catch(console.error)
  }, [country])

  if (!summary || !crops) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  const gdpShareData = Object.entries(summary.by_country)
    .filter(([, d]) => d.ag_gdp_share_pct != null)
    .map(([name, d]) => ({ name, pct: d.ag_gdp_share_pct ?? 0 }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agriculture</h1>
          <p className="text-sm text-muted-foreground">
            Crop yields, trade data, and agricultural indicators
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CountryFilter value={country} onChange={setCountry} />
          <DataFreshness date="Feb 2026" label="Data as of" />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="crops">Crops</TabsTrigger>
          <TabsTrigger value="trade">Trade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Records"
              value={summary.total_records}
              description="Crop-country-year combinations"
              icon={<IconPlant2 size={18} />}
            />
            <StatCard
              title="Countries"
              value={summary.countries.length}
              description={summary.countries.join(", ")}
              icon={<IconWorld size={18} />}
            />
            <StatCard
              title="Crops Tracked"
              value={summary.crops.length}
              description="Distinct crop types"
              icon={<IconSeeding size={18} />}
            />
            <StatCard
              title="Filtered Records"
              value={crops.length}
              description={country === "all" ? "All countries" : country}
            />
          </div>

          {gdpShareData.length > 0 && (
            <ChartWrapper
              title="Agriculture GDP Share (%)"
              description="Agricultural sector contribution to GDP by country"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={gdpShareData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, "Ag GDP Share"]} />
                  <Bar dataKey="pct" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          )}
        </TabsContent>

        <TabsContent value="crops" className="mt-4">
          <DataTable
            columns={CROPS_COLUMNS}
            data={crops as Record<string, unknown>[]}
            emptyMessage="No crop data found for the selected country."
          />
        </TabsContent>

        <TabsContent value="trade" className="mt-4">
          <DataTable
            columns={TRADE_COLUMNS}
            data={crops as Record<string, unknown>[]}
            emptyMessage="No trade data found for the selected country."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
