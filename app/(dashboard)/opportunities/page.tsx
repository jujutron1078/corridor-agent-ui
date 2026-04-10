"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  IconBulb,
  IconPlant2,
  IconArrowsExchange,
  IconDownload,
  IconTrash,
} from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { StatCard } from "@/components/dashboard/stat-card"
import { CountryFilter, type CorridorCountry } from "@/components/dashboard/country-filter"
import {
  listOpportunities,
  updateOpportunityStatus,
  deleteOpportunity,
  exportBrief,
  type Opportunity,
  type OpportunityListResponse,
} from "@/lib/api/opportunities"
import { toast } from "sonner"

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "identified", label: "Identified" },
  { value: "under_review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "archived", label: "Archived" },
]

const STATUS_COLORS: Record<string, string> = {
  identified: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  shortlisted: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
}

function formatUsd(value: number | undefined | null): string {
  if (value === undefined || value === null) return "N/A"
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function OpportunityListCard({
  opportunity,
  onStatusChange,
  onDelete,
  selected,
  onToggleSelect,
}: {
  opportunity: Opportunity
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  selected: boolean
  onToggleSelect: (id: string) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(opportunity.id)}
            className="mt-1 size-4 rounded border-gray-300"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">{opportunity.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {opportunity.sector}
              </Badge>
              <span>{opportunity.country}</span>
              {opportunity.location?.name && (
                <span className="text-muted-foreground">
                  {opportunity.location.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <select
            value={opportunity.status}
            onChange={(e) => onStatusChange(opportunity.id, e.target.value)}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[opportunity.status] ?? ""}`}
          >
            {STATUS_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(opportunity.id)}
          >
            <IconTrash size={14} />
          </Button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
        {opportunity.summary}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {opportunity.bankability_score != null && (
          <div className="rounded bg-muted px-2 py-1">
            <div className="text-[10px] uppercase text-muted-foreground">Bankability</div>
            <div className="text-xs font-medium">
              {(opportunity.bankability_score * 100).toFixed(0)}%
            </div>
          </div>
        )}
        {opportunity.estimated_value_usd != null && (
          <div className="rounded bg-muted px-2 py-1">
            <div className="text-[10px] uppercase text-muted-foreground">Investment</div>
            <div className="text-xs font-medium">
              {formatUsd(opportunity.estimated_value_usd)}
            </div>
          </div>
        )}
        {opportunity.employment_impact != null && (
          <div className="rounded bg-muted px-2 py-1">
            <div className="text-[10px] uppercase text-muted-foreground">Jobs</div>
            <div className="text-xs font-medium">
              {opportunity.employment_impact.toLocaleString()}
            </div>
          </div>
        )}
        {opportunity.risk_level && (
          <div className="rounded bg-muted px-2 py-1">
            <div className="text-[10px] uppercase text-muted-foreground">Risk</div>
            <div
              className={`text-xs font-medium ${
                opportunity.risk_level === "low"
                  ? "text-green-600"
                  : opportunity.risk_level === "high"
                    ? "text-red-600"
                    : "text-yellow-600"
              }`}
            >
              {opportunity.risk_level.charAt(0).toUpperCase() +
                opportunity.risk_level.slice(1)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground">
        {new Date(opportunity.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground">Loading opportunities…</div>}>
      <OpportunitiesContent />
    </Suspense>
  )
}

function OpportunitiesContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get("project_id") ?? "abidjan-lagos"

  const [data, setData] = useState<OpportunityListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [country, setCountry] = useState<CorridorCountry>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTab, setSelectedTab] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const sector = selectedTab === "all" ? undefined : selectedTab
      const result = await listOpportunities(projectId, {
        sector,
        country: country === "all" ? undefined : country,
        status: statusFilter === "all" ? undefined : statusFilter,
      })
      setData(result)
    } catch {
      setData({ opportunities: [], total: 0, sectors: {} })
    } finally {
      setLoading(false)
    }
  }, [projectId, selectedTab, country, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateOpportunityStatus(projectId, id, status)
      await fetchData()
      toast.success("Status updated")
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteOpportunity(projectId, id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await fetchData()
      toast.success("Opportunity deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExport = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error("Select at least one opportunity to export")
      return
    }
    try {
      const brief = await exportBrief(projectId, ids)
      const blob = new Blob([brief], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `investment-brief-${new Date().toISOString().slice(0, 10)}.md`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Investment brief downloaded")
    } catch {
      toast.error("Failed to export brief")
    }
  }

  const opportunities = data?.opportunities ?? []
  const totalValue = opportunities.reduce(
    (sum, o) => sum + (o.estimated_value_usd ?? 0),
    0
  )
  const totalJobs = opportunities.reduce(
    (sum, o) => sum + (o.employment_impact ?? 0),
    0
  )
  const bankabilityScores = opportunities
    .map((o) => o.bankability_score)
    .filter((s): s is number => s != null)
  const avgBankability =
    bankabilityScores.length > 0
      ? bankabilityScores.reduce((a, b) => a + b, 0) / bankabilityScores.length
      : null

  // Sector counts from unfiltered data for tab badges
  const allSectorCounts = data?.sectors ?? {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Investment Opportunities
          </h1>
          <p className="text-sm text-muted-foreground">
            Opportunities identified by the Value Detective agent along the
            Lagos-Abidjan corridor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <CountryFilter value={country} onChange={setCountry} />
          {selectedIds.size > 0 && (
            <Button size="sm" onClick={handleExport}>
              <IconDownload size={16} className="mr-1" />
              Export Brief ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Opportunities"
          value={data?.total ?? 0}
          description="Identified along the corridor"
          icon={<IconBulb size={18} />}
        />
        <StatCard
          title="Total Investment"
          value={formatUsd(totalValue || undefined)}
          description="Estimated across all opportunities"
        />
        <StatCard
          title="Employment Impact"
          value={totalJobs > 0 ? totalJobs.toLocaleString() : "N/A"}
          description="Estimated jobs"
        />
        <StatCard
          title="Avg Bankability"
          value={
            avgBankability != null
              ? `${(avgBankability * 100).toFixed(0)}%`
              : "N/A"
          }
          description="Average bankability score"
        />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            {data?.total != null && data.total > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agriculture">
            <IconPlant2 size={14} className="mr-1" />
            Agriculture
            {(allSectorCounts.agriculture ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {allSectorCounts.agriculture}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trade">
            <IconArrowsExchange size={14} className="mr-1" />
            Trade
            {(allSectorCounts.trade ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {allSectorCounts.trade}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {["all", "agriculture", "trade"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading opportunities...
              </div>
            ) : opportunities.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <IconBulb size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No opportunities yet</p>
                <p className="mt-1 text-xs">
                  Ask the Value Detective agent to identify opportunities along
                  the corridor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {opportunities.map((opp) => (
                  <OpportunityListCard
                    key={opp.id}
                    opportunity={opp}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    selected={selectedIds.has(opp.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
