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
  Legend,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

import { DataTable } from "@/components/dashboard/data-table"
import { ChartWrapper } from "@/components/dashboard/chart-wrapper"
import { DataFreshness } from "@/components/dashboard/data-freshness"
import { DashboardMap, type MapLayer } from "@/components/dashboard/dashboard-map"
import type { FeatureCollection } from "geojson"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"]

interface RoadsCountryData {
  condition?: Record<string, number>
  surface?: Record<string, number>
  road_type?: Record<string, number>
  average_speed_kph?: number
  total_length_km?: number
  [key: string]: unknown
}

interface RoadsResponse {
  total_segments?: number
  total_length_km?: number
  by_country: Record<string, RoadsCountryData>
}

interface Port {
  port_name: string
  country: string
  container_throughput_teu_year: number | null
  number_of_berths: number | null
  draft_m: number | null
  port_charges_usd_teu: number | null
  expansion_plans: string | null
  [key: string]: unknown
}

interface PowerCountry {
  country?: string
  total_capacity_mw?: number | null
  electrification_rate_pct?: number | null
  grid_losses_pct?: number | null
  outage_freq_month?: number | null
  tariff_residential_usd_kwh?: number | null
  [key: string]: unknown
}

const PORTS_COLUMNS = [
  { key: "port_name", label: "Port" },
  { key: "country", label: "Country" },
  {
    key: "container_throughput_teu_year",
    label: "Capacity (TEU/yr)",
    render: (item: Record<string, unknown>) =>
      item.container_throughput_teu_year != null
        ? Number(item.container_throughput_teu_year).toLocaleString()
        : "N/A",
  },
  { key: "number_of_berths", label: "Berths" },
  {
    key: "draft_m",
    label: "Draft (m)",
    render: (item: Record<string, unknown>) =>
      item.draft_m != null ? `${item.draft_m}m` : "N/A",
  },
  {
    key: "port_charges_usd_teu",
    label: "Charges (USD/TEU)",
    render: (item: Record<string, unknown>) =>
      item.port_charges_usd_teu != null
        ? `$${Number(item.port_charges_usd_teu).toLocaleString()}`
        : "N/A",
  },
  {
    key: "expansion_plans",
    label: "Expansion",
    render: (item: Record<string, unknown>) =>
      item.expansion_plans ? (
        <Badge variant="outline" className="text-xs">
          {String(item.expansion_plans)}
        </Badge>
      ) : (
        "None"
      ),
  },
]

const POWER_COLUMNS = [
  { key: "country", label: "Country" },
  {
    key: "total_capacity_mw",
    label: "Capacity (MW)",
    render: (item: Record<string, unknown>) =>
      item.total_capacity_mw != null
        ? Number(item.total_capacity_mw).toLocaleString()
        : "N/A",
  },
  {
    key: "electrification_rate_pct",
    label: "Electrification (%)",
    render: (item: Record<string, unknown>) =>
      item.electrification_rate_pct != null ? `${item.electrification_rate_pct}%` : "N/A",
  },
  {
    key: "grid_losses_pct",
    label: "Grid Losses (%)",
    render: (item: Record<string, unknown>) =>
      item.grid_losses_pct != null ? `${item.grid_losses_pct}%` : "N/A",
  },
  {
    key: "outage_freq_month",
    label: "Outages/Month",
    render: (item: Record<string, unknown>) =>
      item.outage_freq_month != null ? String(item.outage_freq_month) : "N/A",
  },
  {
    key: "tariff_residential_usd_kwh",
    label: "Residential Tariff (USD/kWh)",
    render: (item: Record<string, unknown>) =>
      item.tariff_residential_usd_kwh != null
        ? `$${Number(item.tariff_residential_usd_kwh).toFixed(3)}`
        : "N/A",
  },
]

export default function InfrastructurePage() {
  const [roads, setRoads] = useState<RoadsResponse | null>(null)
  const [ports, setPorts] = useState<Port[] | null>(null)
  const [power, setPower] = useState<PowerCountry[] | null>(null)
  const [geoLayers, setGeoLayers] = useState<Record<string, FeatureCollection> | null>(null)
  const [boundaries, setBoundaries] = useState<FeatureCollection | null>(null)

  useEffect(() => {
    fetch("/api/infrastructure-enriched/roads")
      .then((r) => r.json())
      .then(setRoads)
      .catch(console.error)
    fetch("/api/infrastructure-enriched/ports")
      .then((r) => r.json())
      .then(setPorts)
      .catch(console.error)
    fetch("/api/infrastructure-enriched/power")
      .then((r) => r.json())
      .then(setPower)
      .catch(console.error)
    fetch("/api/geo/infrastructure")
      .then((r) => r.json())
      .then(setGeoLayers)
      .catch(console.error)
    fetch("/api/geo/boundaries")
      .then((r) => r.json())
      .then(setBoundaries)
      .catch(console.error)
  }, [])

  if (!roads || !ports || !power) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  // Build road condition chart data
  const roadConditionData = Object.entries(roads.by_country).map(([cc, d]) => {
    const cond = d.condition ?? {}
    return {
      name: cc,
      Good: cond["Good"] ?? 0,
      Fair: cond["Fair"] ?? 0,
      Poor: cond["Poor"] ?? 0,
    }
  })

  const roadSpeedData = Object.entries(roads.by_country).map(([cc, d]) => ({
    name: cc,
    speed: d.average_speed_kph ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Infrastructure</h1>
          <p className="text-sm text-muted-foreground">
            Roads, ports, and power infrastructure across the corridor
          </p>
        </div>
        <DataFreshness date="Feb 2026" label="Data as of" />
      </div>

      {geoLayers && (
        <DashboardMap
          title="Corridor Infrastructure Map"
          description="Toggle layers to explore infrastructure across the Abidjan-Lagos corridor"
          height="500px"
          layers={[
            ...(boundaries ? [{ id: "boundaries", label: "Country Borders", data: boundaries, type: "fill" as const, visible: true }] : []),
            { id: "ports", label: "Ports", data: geoLayers.ports, pointRadius: 6 },
            { id: "airports", label: "Airports", data: geoLayers.airports, pointRadius: 5 },
            { id: "railways", label: "Railways", data: geoLayers.railways, type: "line" as const },
            { id: "power_plants", label: "Power Plants", data: geoLayers.power_plants, pointRadius: 5 },
            { id: "transmission_lines", label: "Transmission Lines", data: geoLayers.transmission_lines, type: "line" as const },
            { id: "industrial_zones", label: "Industrial Zones", data: geoLayers.industrial_zones, pointRadius: 3 },
            { id: "mining_sites", label: "Mining Sites", data: geoLayers.mining_sites, pointRadius: 3, visible: false },
          ]}
        />
      )}

      <Tabs defaultValue="roads">
        <TabsList>
          <TabsTrigger value="roads">Roads</TabsTrigger>
          <TabsTrigger value="ports">Ports</TabsTrigger>
          <TabsTrigger value="power">Power</TabsTrigger>
        </TabsList>

        <TabsContent value="roads" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartWrapper
              title="Road Condition Breakdown"
              description="Proportion of Good / Fair / Poor roads per country"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={roadConditionData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Good" stackId="a" fill={COLORS[1]} />
                  <Bar dataKey="Fair" stackId="a" fill={COLORS[3]} />
                  <Bar dataKey="Poor" stackId="a" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>

            <ChartWrapper
              title="Average Road Speed"
              description="Average vehicle speed (km/h) by country"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={roadSpeedData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit=" km/h" />
                  <Tooltip formatter={(v) => [`${v} km/h`, "Avg Speed"]} />
                  <Bar dataKey="speed" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>

          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Summary: </span>
            {roads.total_segments != null && `${roads.total_segments.toLocaleString()} total road segments`}
            {roads.total_length_km != null && ` — ${roads.total_length_km.toLocaleString()} km total length`}
          </div>
        </TabsContent>

        <TabsContent value="ports" className="mt-4">
          <DataTable
            columns={PORTS_COLUMNS}
            data={ports as Record<string, unknown>[]}
            emptyMessage="No port data available."
          />
        </TabsContent>

        <TabsContent value="power" className="mt-4">
          <DataTable
            columns={POWER_COLUMNS}
            data={power as Record<string, unknown>[]}
            emptyMessage="No power data available."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
