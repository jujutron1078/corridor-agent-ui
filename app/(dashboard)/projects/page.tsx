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
import {
  IconBriefcase,
  IconCurrencyDollar,
  IconActivity,
  IconCategory,
} from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import { StatCard } from "@/components/dashboard/stat-card"
import { CountryFilter, type CorridorCountry } from "@/components/dashboard/country-filter"
import { DataTable } from "@/components/dashboard/data-table"
import { ChartWrapper } from "@/components/dashboard/chart-wrapper"
import { DataFreshness } from "@/components/dashboard/data-freshness"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"]

const STATUS_COLORS: Record<string, string> = {
  Active: "default",
  Completed: "secondary",
  Pipeline: "outline",
  "Under Construction": "default",
}

interface Project {
  name: string
  sector: string
  status: string
  countries: string | string[]
  total_cost_usd_million: number | null
  secured_financing_usd_million: number | null
  jobs_direct: number | null
  expected_completion: string | null
  lead_agency: string | null
  [key: string]: unknown
}

interface ProjectsSummary {
  total_projects: number
  total_cost_usd_million: number
  by_sector: Record<string, number>
  by_status: Record<string, number>
  by_country: Record<string, number>
}

const STATUS_OPTIONS = ["all", "Active", "Completed", "Pipeline", "Under Construction"]

const TABLE_COLUMNS = [
  { key: "name", label: "Project" },
  { key: "sector", label: "Sector" },
  {
    key: "status",
    label: "Status",
    render: (item: Record<string, unknown>) => (
      <Badge variant={(STATUS_COLORS[String(item.status)] as "default" | "secondary" | "outline") ?? "outline"}>
        {String(item.status ?? "N/A")}
      </Badge>
    ),
  },
  {
    key: "countries",
    label: "Countries",
    render: (item: Record<string, unknown>) => {
      const c = item.countries
      if (!c) return "N/A"
      return Array.isArray(c) ? c.join(", ") : String(c)
    },
  },
  {
    key: "total_cost_usd_million",
    label: "Cost (USD M)",
    render: (item: Record<string, unknown>) =>
      item.total_cost_usd_million != null
        ? `$${Number(item.total_cost_usd_million).toLocaleString()}M`
        : "N/A",
  },
  {
    key: "expected_completion",
    label: "Completion",
    render: (item: Record<string, unknown>) =>
      item.expected_completion != null ? String(item.expected_completion) : "N/A",
  },
]

export default function ProjectsPage() {
  const [summary, setSummary] = useState<ProjectsSummary | null>(null)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [country, setCountry] = useState<CorridorCountry>("all")
  const [status, setStatus] = useState<string>("all")

  useEffect(() => {
    fetch("/api/projects-enriched/summary")
      .then((r) => r.json())
      .then(setSummary)
      .catch(console.error)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (country !== "all") params.set("country", country)
    if (status !== "all") params.set("status", status)
    const qs = params.toString()
    fetch(`/api/projects-enriched/projects${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then(setProjects)
      .catch(console.error)
  }, [country, status])

  if (!summary || !projects) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  const sectorChartData = Object.entries(summary.by_sector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const statusChartData = Object.entries(summary.by_status).map(([name, count]) => ({
    name,
    count,
  }))

  const activeCount = summary.by_status["Active"] ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Development and infrastructure projects across the corridor
          </p>
        </div>
        <DataFreshness date="Feb 2026" label="Data as of" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Projects"
          value={summary.total_projects}
          description="All tracked projects"
          icon={<IconBriefcase size={18} />}
        />
        <StatCard
          title="Total Cost"
          value={`$${summary.total_cost_usd_million.toLocaleString()}M`}
          description="Combined project value"
          icon={<IconCurrencyDollar size={18} />}
        />
        <StatCard
          title="Active Projects"
          value={activeCount}
          description="Currently underway"
          icon={<IconActivity size={18} />}
        />
        <StatCard
          title="Sectors"
          value={Object.keys(summary.by_sector).length}
          description="Distinct project sectors"
          icon={<IconCategory size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartWrapper title="Projects by Sector" description="Top 10 sectors by project count">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={sectorChartData}
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

        <ChartWrapper title="Projects by Status">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={statusChartData}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusChartData.map((_, i) => (
                  <rect key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-medium">Project Directory</h2>
          <div className="flex items-center gap-2">
            <CountryFilter value={country} onChange={setCountry} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All Statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable
          columns={TABLE_COLUMNS}
          data={projects as Record<string, unknown>[]}
          emptyMessage="No projects found for the selected filters."
        />
      </div>
    </div>
  )
}
