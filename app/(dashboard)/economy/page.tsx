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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from "@tabler/icons-react"

import { ChartWrapper } from "@/components/dashboard/chart-wrapper"
import { DataFreshness } from "@/components/dashboard/data-freshness"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"]

const TRADE_COLORS: Record<string, string> = {
  agricultural: "#16a34a",
  food: "#d97706",
  fuel: "#dc2626",
  manufactures: "#2563eb",
  ores_metals: "#7c3aed",
}

interface WorldBankIndicators {
  gdp_current_usd?: number | Record<string, number> | null
  gdp_growth_annual_pct?: number | Record<string, number> | null
  inflation_consumer_prices_pct?: number | Record<string, number> | null
  fdi_net_inflows_usd?: number | Record<string, number> | null
  [key: string]: unknown
}

/** Extract the most recent value from a year→value dict, or return the value if already a number. */
function latestValue(v: number | Record<string, number> | null | undefined): number | null {
  if (v == null) return null
  if (typeof v === "number") return v
  if (typeof v === "object") {
    const years = Object.keys(v).sort().reverse()
    for (const y of years) {
      if (v[y] != null && !isNaN(v[y])) return v[y]
    }
  }
  return null
}

interface MacroIndicator {
  country_code: string
  worldbank_indicators?: WorldBankIndicators
  export_composition?: Record<string, unknown>
  tax_rates?: Record<string, unknown>
  [key: string]: unknown
}

type TradeComposition = Record<string, Record<string, number>>

function fmtGdp(v: number | null | undefined): string {
  if (v == null) return "N/A"
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  return `$${v.toLocaleString()}`
}

function GrowthIcon({ value }: { value: number | null | undefined }) {
  if (value == null) return null
  if (value > 0) return <IconTrendingUp size={14} className="text-green-600" />
  if (value < 0) return <IconTrendingDown size={14} className="text-red-600" />
  return <IconMinus size={14} className="text-muted-foreground" />
}

export default function EconomyPage() {
  const [indicators, setIndicators] = useState<MacroIndicator[] | null>(null)
  const [tradeComposition, setTradeComposition] = useState<TradeComposition | null>(null)

  useEffect(() => {
    fetch("/api/macro-enriched/indicators")
      .then((r) => r.json())
      .then((d) => {
        const list: MacroIndicator[] = Array.isArray(d) ? d : Object.values(d)
        setIndicators(list)
      })
      .catch(console.error)

    // Trade composition comes from the same enriched endpoint — extract sectors
    fetch("/api/macro-enriched/trade-composition")
      .then((r) => r.json())
      .then((d) => {
        // API returns [{country_code, export_composition: {sectors: {agricultural_raw_materials_pct, food_pct, ...}}}]
        const comp: TradeComposition = {}
        const list = Array.isArray(d) ? d : Object.values(d)
        for (const rec of list) {
          const cc = (rec as Record<string, unknown>).country_code as string
          const sectors = ((rec as Record<string, unknown>).export_composition as Record<string, unknown>)?.sectors as Record<string, number> | undefined
          if (cc && sectors) {
            comp[cc] = {
              agricultural: sectors.agricultural_raw_materials_pct ?? 0,
              food: sectors.food_pct ?? 0,
              fuel: sectors.fuel_pct ?? 0,
              manufactures: sectors.manufactures_pct ?? 0,
              ores_metals: sectors.ores_metals_pct ?? 0,
            }
          }
        }
        setTradeComposition(comp)
      })
      .catch(console.error)
  }, [])

  if (!indicators || !tradeComposition) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  const tradeChartData = Object.entries(tradeComposition).map(([cc, comp]) => ({
    name: cc,
    agricultural: comp.agricultural ?? 0,
    food: comp.food ?? 0,
    fuel: comp.fuel ?? 0,
    manufactures: comp.manufactures ?? 0,
    ores_metals: comp.ores_metals ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Economy</h1>
          <p className="text-sm text-muted-foreground">
            Macroeconomic indicators and trade composition across the corridor
          </p>
        </div>
        <DataFreshness date="Feb 2026" label="Data as of" />
      </div>

      <Tabs defaultValue="macro">
        <TabsList>
          <TabsTrigger value="macro">Macro Indicators</TabsTrigger>
          <TabsTrigger value="trade">Trade Composition</TabsTrigger>
        </TabsList>

        <TabsContent value="macro" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {indicators.map((ind) => {
              const wb = ind.worldbank_indicators ?? {}
              const gdp = latestValue(wb.gdp_current_usd)
              const growth = latestValue(wb.gdp_growth_annual_pct)
              const inflation = latestValue(wb.inflation_consumer_prices_pct)
              const fdi = latestValue(wb.fdi_net_inflows_usd)
              return (
                <Card key={ind.country_code}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      {ind.country_code}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GDP</span>
                      <span className="font-medium">{fmtGdp(gdp)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">GDP Growth</span>
                      <span className="font-medium flex items-center gap-1">
                        <GrowthIcon value={growth} />
                        {growth != null ? `${growth.toFixed(1)}%` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inflation</span>
                      <span className="font-medium">
                        {inflation != null ? `${inflation.toFixed(1)}%` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FDI Net Inflows</span>
                      <span className="font-medium">{fmtGdp(fdi)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="trade" className="mt-4">
          <ChartWrapper
            title="Export Composition by Country"
            description="Percentage breakdown of export categories"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={tradeChartData}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name]} />
                <Legend />
                {Object.keys(TRADE_COLORS).map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={TRADE_COLORS[key]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </TabsContent>
      </Tabs>
    </div>
  )
}
