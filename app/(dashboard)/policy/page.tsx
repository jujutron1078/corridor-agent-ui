"use client"

import { useEffect, useState } from "react"
import { DataFreshness } from "@/components/dashboard/data-freshness"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"

interface CountryPolicy {
  country: string
  country_name: string
  investment: {
    tax_holiday_years?: number
    customs_exemption?: boolean
    vat_exemption?: boolean
    epz_corporate_tax?: number
    local_employment_pct?: number
    one_stop_shop?: boolean
    sector_priorities?: string[]
    minimum_investment?: Record<string, number>
    approval_days?: Record<string, number>
    bilateral_treaties?: number
  }
  environment?: {
    eia_threshold_mining_usd?: number
    eia_timeline_days?: number
    emission_limits?: Record<string, number>
  }
  trade_agreements?: string[]
}

interface GovernanceData {
  [iso3: string]: {
    country: string
    year: number
    indicators: {
      v2x_polyarchy: number
      v2x_libdem: number
      v2x_rule: number
      v2x_corr: number
      v2x_civlib: number
    }
  }
}

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"]

const GOV_LABELS: Record<string, string> = {
  v2x_polyarchy: "Democracy",
  v2x_libdem: "Liberal Democracy",
  v2x_rule: "Rule of Law",
  v2x_corr: "Corruption",
  v2x_civlib: "Civil Liberties",
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "N/A"
  if (typeof val === "boolean") return val ? "Yes" : "No"
  if (typeof val === "number") return val.toLocaleString()
  return String(val)
}

function fmtUsd(v: number | undefined): string {
  if (v == null) return "N/A"
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

export default function PolicyPage() {
  const [countries, setCountries] = useState<CountryPolicy[]>([])
  const [governance, setGovernance] = useState<GovernanceData | null>(null)

  useEffect(() => {
    fetch("/api/policy/comparison")
      .then((r) => r.json())
      .then((d) => setCountries(d.countries ?? []))
      .catch(console.error)

    fetch("/api/policy/governance")
      .then((r) => r.json())
      .then((d) => setGovernance(d.data ?? d))
      .catch(console.error)
  }, [])

  if (!countries.length) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  // Build governance radar data
  const govIndicators = ["v2x_polyarchy", "v2x_libdem", "v2x_rule", "v2x_corr", "v2x_civlib"]
  const radarData = governance
    ? govIndicators.map((key) => {
        const row: Record<string, unknown> = { indicator: GOV_LABELS[key] ?? key }
        for (const [iso3, g] of Object.entries(governance)) {
          row[iso3] = (g.indicators as Record<string, number>)[key] ?? 0
        }
        return row
      })
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Policy Comparison</h1>
          <p className="text-sm text-muted-foreground">
            Investment climate and governance benchmarks across corridor countries
          </p>
        </div>
        <DataFreshness date="Feb 2026" label="Data as of" />
      </div>

      {/* Investment Climate Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-56">
                Investment Climate
              </th>
              {countries.map((c) => (
                <th key={c.country} className="px-4 py-3 text-center font-semibold">
                  {c.country}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-background">
              <td className="px-4 py-2.5 font-medium text-muted-foreground">Tax Holiday (years)</td>
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 text-center">{formatValue(c.investment.tax_holiday_years)}</td>
              ))}
            </tr>
            <tr className="bg-muted/20">
              <td className="px-4 py-2.5 font-medium text-muted-foreground">Customs Exemption</td>
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 text-center">{formatValue(c.investment.customs_exemption)}</td>
              ))}
            </tr>
            <tr className="bg-background">
              <td className="px-4 py-2.5 font-medium text-muted-foreground">VAT Exemption</td>
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 text-center">{formatValue(c.investment.vat_exemption)}</td>
              ))}
            </tr>
            <tr className="bg-muted/20">
              <td className="px-4 py-2.5 font-medium text-muted-foreground">EPZ Corporate Tax (%)</td>
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 text-center">{formatValue(c.investment.epz_corporate_tax)}</td>
              ))}
            </tr>
            <tr className="bg-background">
              <td className="px-4 py-2.5 font-medium text-muted-foreground">Local Employment (%)</td>
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 text-center">{formatValue(c.investment.local_employment_pct)}</td>
              ))}
            </tr>
            <tr className="bg-muted/20">
              <td className="px-4 py-2.5 font-medium text-muted-foreground">One-Stop Shop</td>
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 text-center">{formatValue(c.investment.one_stop_shop)}</td>
              ))}
            </tr>
            <tr className="bg-background">
              <td className="px-4 py-2.5 font-medium text-muted-foreground">Bilateral Treaties</td>
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 text-center">{formatValue(c.investment.bilateral_treaties)}</td>
              ))}
            </tr>
            <tr className="bg-muted/20">
              <td className="px-4 py-2.5 font-medium text-muted-foreground">Min. Investment (General)</td>
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 text-center">{fmtUsd(c.investment.minimum_investment?.general)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Approval Timelines */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-56">
                Approval Timeline (days)
              </th>
              {countries.map((c) => (
                <th key={c.country} className="px-4 py-3 text-center font-semibold">
                  {c.country}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["company_registration", "investment_approval", "land_acquisition", "environmental_clearance", "construction_permit"].map((key, i) => (
              <tr key={key} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <td className="px-4 py-2.5 font-medium text-muted-foreground">
                  {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </td>
                {countries.map((c) => (
                  <td key={c.country} className="px-4 py-2.5 text-center">
                    {formatValue(c.investment.approval_days?.[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Governance Radar Chart */}
      {radarData.length > 0 && governance && (
        <div className="rounded-lg border p-4">
          <h2 className="text-base font-semibold mb-1">Governance Indicators (V-Dem)</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Higher = better governance (except Corruption, where higher = more corrupt)
          </p>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="indicator" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
              {Object.keys(governance).map((iso3, i) => (
                <Radar
                  key={iso3}
                  name={governance[iso3].country}
                  dataKey={iso3}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.1}
                />
              ))}
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sector Priorities */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-56">
                Priority Sectors
              </th>
              {countries.map((c) => (
                <th key={c.country} className="px-4 py-3 text-left font-semibold">
                  {c.country}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* First col spacer */}
              <td className="px-4 py-2.5" />
              {countries.map((c) => (
                <td key={c.country} className="px-4 py-2.5 align-top">
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {(c.investment.sector_priorities ?? []).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
