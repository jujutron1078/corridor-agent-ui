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
import { IconUsers, IconCategory, IconWorld } from "@tabler/icons-react"

import { StatCard } from "@/components/dashboard/stat-card"
import { CountryFilter, type CorridorCountry } from "@/components/dashboard/country-filter"
import { DataTable } from "@/components/dashboard/data-table"
import { ChartWrapper } from "@/components/dashboard/chart-wrapper"
import { DataFreshness } from "@/components/dashboard/data-freshness"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"]

interface Stakeholder {
  name: string
  org_type: string
  country_code: string
  role: string
  sectors: string | string[]
  project_name: string
  project_value_usd: number | null
  website: string
  [key: string]: unknown
}

interface StakeholderSummary {
  total: number
  by_country: Record<string, number>
  by_type: Record<string, number>
}

const TABLE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "org_type", label: "Type" },
  { key: "country_code", label: "Country" },
  { key: "role", label: "Role" },
  { key: "project_name", label: "Project" },
]

export default function StakeholdersPage() {
  const [summary, setSummary] = useState<StakeholderSummary | null>(null)
  const [stakeholders, setStakeholders] = useState<Stakeholder[] | null>(null)
  const [country, setCountry] = useState<CorridorCountry>("all")

  useEffect(() => {
    fetch("/api/stakeholders-registry/summary")
      .then((r) => r.json())
      .then(setSummary)
      .catch(console.error)
  }, [])

  useEffect(() => {
    const url =
      country === "all"
        ? "/api/stakeholders-registry/stakeholders"
        : `/api/stakeholders-registry/stakeholders?country=${country}`
    fetch(url)
      .then((r) => r.json())
      .then(setStakeholders)
      .catch(console.error)
  }, [country])

  if (!summary || !stakeholders) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  const typeChartData = Object.entries(summary.by_type)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stakeholder Registry</h1>
          <p className="text-sm text-muted-foreground">
            Organizations, investors, and agencies active across the corridor
          </p>
        </div>
        <DataFreshness date="Feb 2026" label="Data as of" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Organizations"
          value={summary.total}
          description="Registered stakeholders"
          icon={<IconUsers size={18} />}
        />
        <StatCard
          title="Organization Types"
          value={Object.keys(summary.by_type).length}
          description="Distinct org categories"
          icon={<IconCategory size={18} />}
        />
        <StatCard
          title="Countries Covered"
          value={Object.keys(summary.by_country).length}
          description="Corridor countries represented"
          icon={<IconWorld size={18} />}
        />
        <StatCard
          title="Most Active Country"
          value={
            Object.entries(summary.by_country).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A"
          }
          description={`${Math.max(...Object.values(summary.by_country))} organizations`}
        />
      </div>

      <ChartWrapper
        title="Organizations by Type"
        description="Top 10 organization types by count"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={typeChartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 120, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Stakeholder Directory</h2>
          <CountryFilter value={country} onChange={setCountry} />
        </div>
        <DataTable
          columns={TABLE_COLUMNS}
          data={stakeholders as Record<string, unknown>[]}
          emptyMessage="No stakeholders found for the selected country."
        />
      </div>
    </div>
  )
}
