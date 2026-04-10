"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  IconBuildingFactory2,
  IconWorld,
  IconCategory,
} from "@tabler/icons-react"

import { StatCard } from "@/components/dashboard/stat-card"
import { CountryFilter, type CorridorCountry } from "@/components/dashboard/country-filter"
import { DataTable } from "@/components/dashboard/data-table"
import { ChartWrapper } from "@/components/dashboard/chart-wrapper"
import { DataFreshness } from "@/components/dashboard/data-freshness"
import { NoteBanner } from "@/components/dashboard/note-banner"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"]

interface Company {
  company_name: string
  sector: string
  location: string
  country_code: string
  [key: string]: unknown
}

interface ManufacturingSummary {
  total: number
  by_country: Record<string, number>
  by_sector: Record<string, number>
}

export default function ManufacturingPage() {
  const [summary, setSummary] = useState<ManufacturingSummary | null>(null)
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [country, setCountry] = useState<CorridorCountry>("all")

  useEffect(() => {
    fetch("/api/manufacturing/summary")
      .then((r) => r.json())
      .then(setSummary)
      .catch(console.error)
  }, [])

  useEffect(() => {
    const url =
      country === "all"
        ? "/api/manufacturing/companies"
        : `/api/manufacturing/companies?country=${country}`
    fetch(url)
      .then((r) => r.json())
      .then(setCompanies)
      .catch(console.error)
  }, [country])

  if (!summary || !companies) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  const topSector = Object.entries(summary.by_sector).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A"

  const countryChartData = Object.entries(summary.by_country).map(([name, count]) => ({
    name,
    count,
  }))

  const rawSectors = Object.entries(summary.by_sector)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)

  // Group small sectors (< 3% of total) into "Other" to reduce clutter
  const total = rawSectors.reduce((s, r) => s + r.value, 0)
  const threshold = total * 0.03
  const topSectors = rawSectors.filter((s) => s.value >= threshold)
  const otherValue = rawSectors.filter((s) => s.value < threshold).reduce((s, r) => s + r.value, 0)
  const sectorChartData = otherValue > 0 ? [...topSectors, { name: "Other", value: otherValue }] : topSectors

  const tableColumns = [
    { key: "company_name", label: "Company" },
    { key: "sector", label: "Sector" },
    { key: "location", label: "Location" },
    { key: "country_code", label: "Country" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manufacturing</h1>
          <p className="text-sm text-muted-foreground">
            Companies and sector distribution across the corridor
          </p>
        </div>
        <DataFreshness date="Feb 2026" label="Data as of" />
      </div>

      <NoteBanner message="Data covers 3 of 5 corridor countries (CIV, GHA, NGA)" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Companies"
          value={summary.total}
          description="Across all tracked countries"
          icon={<IconBuildingFactory2 size={18} />}
        />
        <StatCard
          title="Countries Covered"
          value={3}
          description="CIV, GHA, NGA"
          icon={<IconWorld size={18} />}
        />
        <StatCard
          title="Top Sector"
          value={topSector}
          description={`${summary.by_sector[topSector] ?? 0} companies`}
          icon={<IconCategory size={18} />}
        />
        <StatCard
          title="Sectors Tracked"
          value={Object.keys(summary.by_sector).length}
          description="Distinct industry sectors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartWrapper title="Companies by Country">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={countryChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Sector Distribution">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={sectorChartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 120, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v) => [`${v} companies`, "Count"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {sectorChartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Company Directory</h2>
          <CountryFilter value={country} onChange={setCountry} />
        </div>
        <DataTable
          columns={tableColumns}
          data={companies as Record<string, unknown>[]}
          emptyMessage="No companies found for the selected country."
        />
      </div>
    </div>
  )
}
