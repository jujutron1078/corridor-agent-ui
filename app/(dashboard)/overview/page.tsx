"use client"

import { useEffect, useState } from "react"
import {
  IconMapPin, IconBuilding, IconUsers, IconBriefcase,
  IconCurrencyDollar, IconTrendingUp, IconBolt,
  IconAlertTriangle, IconPlant2, IconBeach,
} from "@tabler/icons-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"

import { StatCard } from "@/components/dashboard/stat-card"
import { DataFreshness } from "@/components/dashboard/data-freshness"

const ISO3 = ["CIV", "GHA", "TGO", "BEN", "NGA"]
const NAMES: Record<string, string> = { CIV: "Côte d'Ivoire", GHA: "Ghana", TGO: "Togo", BEN: "Benin", NGA: "Nigeria" }
const COLORS = ["#f59e0b", "#22c55e", "#8b5cf6", "#3b82f6", "#ef4444"]
const PIE_COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#64748b", "#ec4899"]

function fmtB(v: number) { return v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${v.toLocaleString()}` }

type IndRecord = { country?: string; country_iso3?: string; year?: number; value?: number }

/** Extract latest value per corridor country from indicator response */
function latestByCountry(data: IndRecord[]) {
  const map: Record<string, IndRecord> = {}
  for (const d of data) {
    const iso = d.country_iso3 ?? ""
    if (!ISO3.includes(iso)) continue
    if (!map[iso] || (d.year ?? 0) > (map[iso].year ?? 0)) map[iso] = d
  }
  return ISO3.map((c) => ({ country: NAMES[c] ?? c, iso: c, value: Number(map[c]?.value ?? 0) }))
}

export default function OverviewPage() {
  const [gdpData, setGdpData] = useState<IndRecord[]>([])
  const [growthData, setGrowthData] = useState<IndRecord[]>([])
  const [tradeData, setTradeData] = useState<IndRecord[]>([])
  const [fdiData, setFdiData] = useState<IndRecord[]>([])
  const [popData, setPopData] = useState<IndRecord[]>([])

  const [projectSummary, setProjectSummary] = useState<{ total_projects?: number; total_cost_usd_million?: number; by_sector?: Record<string, number> } | null>(null)
  const [mfgSummary, setMfgSummary] = useState<{ total?: number; by_country?: Record<string, number>; by_sector?: Record<string, number> } | null>(null)
  const [cropSummary, setCropSummary] = useState<{ total_records?: number; crops?: string[] } | null>(null)
  const [tourismData, setTourismData] = useState<{ country: string; arrivals: number; receipts: number }[]>([])

  const [energySummary, setEnergySummary] = useState<{ total_plants: number; total_capacity_mw: number; fuel_breakdown: Record<string, number> } | null>(null)
  const [conflictSummary, setConflictSummary] = useState<{ total_events: number; total_fatalities: number; by_type: Record<string, number> } | null>(null)

  useEffect(() => {
    // Indicators — response shape: { data: [...] }
    const fetchInd = (key: string, setter: (v: IndRecord[]) => void) =>
      fetch(`/api/indicators?indicator=${key}`)
        .then((r) => r.json())
        .then((d) => setter(d?.data ?? (Array.isArray(d) ? d : [])))
        .catch(() => {})

    fetchInd("GDP", setGdpData)
    fetchInd("GDP_GROWTH", setGrowthData)
    fetchInd("TRADE_PCT_GDP", setTradeData)
    fetchInd("FDI", setFdiData)
    fetchInd("POPULATION", setPopData)

    // Projects
    fetch("/api/projects-enriched/summary").then((r) => r.json()).then(setProjectSummary).catch(() => {})
    // Manufacturing
    fetch("/api/manufacturing/summary").then((r) => r.json()).then(setMfgSummary).catch(() => {})
    // Agriculture
    fetch("/api/agriculture-enriched/summary").then((r) => r.json()).then(setCropSummary).catch(() => {})

    // Tourism — response is a dict keyed by country name
    fetch("/api/tourism/comparison").then((r) => r.json()).then((d) => {
      if (!d || typeof d !== "object") return
      // Could be { countries: [...] } or { "Côte d'Ivoire": {...}, ... }
      if (Array.isArray(d.countries)) {
        setTourismData(d.countries.map((c: { country?: string; annual_arrivals?: number; tourism_receipts_usd_million?: number }) => ({
          country: c.country ?? "?",
          arrivals: c.annual_arrivals ?? 0,
          receipts: c.tourism_receipts_usd_million ?? 0,
        })))
      } else {
        // Dict keyed by country name
        setTourismData(Object.values(d).map((c: unknown) => {
          const rec = c as { country?: string; annual_arrivals?: number; tourism_receipts_usd_million?: number }
          return { country: rec.country ?? "?", arrivals: rec.annual_arrivals ?? 0, receipts: rec.tourism_receipts_usd_million ?? 0 }
        }))
      }
    }).catch(() => {})

    // Energy plants — GeoJSON FeatureCollection
    fetch("/api/energy/plants").then((r) => r.json()).then((d) => {
      const features = d?.features ?? []
      const fuels: Record<string, number> = {}
      let totalCap = 0
      for (const f of features) {
        const cap = Number(f.properties?.capacity_mw ?? 0)
        const fuel = String(f.properties?.fuel_category ?? f.properties?.primary_fuel ?? "other")
        totalCap += cap
        fuels[fuel] = (fuels[fuel] ?? 0) + cap
      }
      setEnergySummary({ total_plants: features.length, total_capacity_mw: totalCap, fuel_breakdown: fuels })
    }).catch(() => {})

    // Conflict — { summary: { total_events, total_fatalities, by_event_type } }
    fetch("/api/conflict").then((r) => r.json()).then((d) => {
      const s = d?.summary ?? {}
      setConflictSummary({
        total_events: s.total_events ?? 0,
        total_fatalities: s.total_fatalities ?? 0,
        by_type: s.by_event_type ?? {},
      })
    }).catch(() => {})
  }, [])

  // Processed chart data
  const gdpChart = latestByCountry(gdpData)
  const growthChart = latestByCountry(growthData)
  const tradeChart = latestByCountry(tradeData)
  const popChart = latestByCountry(popData)

  const totalPop = popChart.reduce((s, d) => s + d.value, 0)
  const totalGdp = gdpChart.reduce((s, d) => s + d.value, 0)
  const avgGrowth = growthChart.filter((d) => d.value > 0).length > 0
    ? growthChart.filter((d) => d.value > 0).reduce((s, d) => s + d.value, 0) / growthChart.filter((d) => d.value > 0).length
    : 0
  const totalFdi = latestByCountry(fdiData).reduce((s, d) => s + d.value, 0)

  // Energy fuel mix pie
  const fuelPie = Object.entries(energySummary?.fuel_breakdown ?? {})
    .map(([fuel, mw]) => ({ name: fuel, value: Math.round(mw) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // Conflict by type
  const conflictChart = Object.entries(conflictSummary?.by_type ?? {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // Project sectors — clean up dict-as-string format
  const projectSectors = Object.entries(projectSummary?.by_sector ?? {})
    .map(([sector, count]) => {
      const clean = typeof sector === "string" && sector.startsWith("{") ? "Other" : sector
      return { sector: clean, count: count as number }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Tourism chart
  const tourismChart = tourismData.filter((d) => d.arrivals > 0).sort((a, b) => b.arrivals - a.arrivals)

  // Manufacturing by sector
  const mfgSectors = Object.entries(mfgSummary?.by_sector ?? {})
    .map(([sector, count]) => ({ sector, count: count as number }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Corridor Overview</h1>
          <p className="text-sm text-muted-foreground">Lagos-Abidjan Economic Corridor — 5 countries, 1,028 km</p>
        </div>
        <DataFreshness date="Mar 2026" label="Updated" />
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Countries" value="5" description="CIV, GHA, TGO, BEN, NGA" icon={<IconMapPin className="h-4 w-4" />} />
        <StatCard title="Population" value={totalPop > 0 ? `${(totalPop / 1e6).toFixed(0)}M` : "—"} description="Combined corridor" icon={<IconUsers className="h-4 w-4" />} />
        <StatCard title="Combined GDP" value={totalGdp > 0 ? fmtB(totalGdp) : "—"} description="Current USD" icon={<IconCurrencyDollar className="h-4 w-4" />} />
        <StatCard title="Avg Growth" value={avgGrowth > 0 ? `${avgGrowth.toFixed(1)}%` : "—"} description="GDP growth rate" icon={<IconTrendingUp className="h-4 w-4" />} />
        <StatCard title="FDI Inflows" value={totalFdi > 0 ? fmtB(totalFdi) : "—"} description="Foreign direct investment" icon={<IconCurrencyDollar className="h-4 w-4" />} />
        <StatCard title="Projects" value={projectSummary?.total_projects ?? "—"} description={projectSummary?.total_cost_usd_million ? `$${(projectSummary.total_cost_usd_million / 1000).toFixed(0)}B pipeline` : ""} icon={<IconBriefcase className="h-4 w-4" />} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Companies" value={mfgSummary?.total ?? "—"} description="Manufacturing firms" icon={<IconBuilding className="h-4 w-4" />} />
        <StatCard title="Power Plants" value={energySummary?.total_plants ?? "—"} description={energySummary ? `${(energySummary.total_capacity_mw / 1000).toFixed(1)} GW capacity` : ""} icon={<IconBolt className="h-4 w-4" />} />
        <StatCard title="Conflict Events" value={conflictSummary?.total_events?.toLocaleString() ?? "—"} description={conflictSummary ? `${conflictSummary.total_fatalities.toLocaleString()} fatalities` : ""} icon={<IconAlertTriangle className="h-4 w-4" />} />
        <StatCard title="Crops Tracked" value={cropSummary?.crops?.length ?? "—"} description={`${cropSummary?.total_records ?? 0} records`} icon={<IconPlant2 className="h-4 w-4" />} />
        <StatCard title="Tourism" value={tourismData.length > 0 ? `${tourismData.length} countries` : "—"} description="Indicators tracked" icon={<IconBeach className="h-4 w-4" />} />
        <StatCard title="Corridor Length" value="1,028 km" description="Abidjan → Lagos" icon={<IconMapPin className="h-4 w-4" />} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {gdpChart.some((d) => d.value > 0) && (
          <Section title="GDP by Country (Current USD)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gdpChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="country" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(0)}B` : `$${(v / 1e6).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => fmtB(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {gdpChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {growthChart.some((d) => d.value > 0) && (
          <Section title="GDP Growth Rate (%)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={growthChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="country" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                <Tooltip formatter={(v: number) => `${Number(v).toFixed(2)}%`} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {growthChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tradeChart.some((d) => d.value > 0) && (
          <Section title="Trade as % of GDP">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tradeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="country" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v: number) => `${Number(v).toFixed(1)}%`} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {tradeChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {fuelPie.length > 0 && (
          <Section title="Energy Generation Mix (MW)">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={fuelPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                  {fuelPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} MW`} />
              </PieChart>
            </ResponsiveContainer>
          </Section>
        )}
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {conflictChart.length > 0 && (
          <Section title="Conflict Events by Type">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={conflictChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 9 }} width={150} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {projectSectors.length > 0 && (
          <Section title="Projects by Sector">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projectSectors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 9 }} width={180} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}
      </div>

      {/* Charts row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tourismChart.length > 0 && (
          <Section title="Tourism Arrivals by Country">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tourismChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="country" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Bar dataKey="arrivals" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {mfgSectors.length > 0 && (
          <Section title="Manufacturing by Sector">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mfgSectors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 9 }} width={160} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}
      </div>

      {/* Population chart */}
      {popChart.some((d) => d.value > 0) && (
        <Section title="Population by Country">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={popChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => `${(Number(v) / 1e6).toFixed(1)}M`} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {popChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}
