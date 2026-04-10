"use client"

import { AreaChart, Area, ResponsiveContainer } from "recharts"
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"

interface KpiCardProps {
  label: string
  value: number | null
  unit: string
  trend: number[]
  trendYears: number[]
  loading?: boolean
}

export function KpiCard({ label, value, unit, trend, trendYears, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-white/5 p-3">
        <Skeleton className="mb-2 h-3 w-24 bg-white/10" />
        <Skeleton className="mb-3 h-7 w-20 bg-white/10" />
        <Skeleton className="h-10 w-full bg-white/10" />
      </div>
    )
  }

  // Compute YoY change
  const prevValue = trend.length >= 2 ? trend[trend.length - 2] : null
  const currentValue = value ?? (trend.length ? trend[trend.length - 1] : null)
  const change = prevValue != null && currentValue != null ? currentValue - prevValue : null
  const changePositive = change != null && change > 0

  // Sparkline data
  const sparkData = trend.map((v, i) => ({
    year: trendYears[i] ?? 2015 + i,
    value: v,
  }))

  const sparkColor = changePositive ? "#22c55e" : change != null && change < 0 ? "#ef4444" : "#94a3b8"

  return (
    <div className="rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/8">
      <div className="mb-1 text-xs font-medium text-white/50">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tabular-nums tracking-tight text-white">
          {currentValue != null ? formatValue(currentValue) : "N/A"}
        </span>
        {unit && <span className="text-xs text-white/40">{unit}</span>}
        {change != null && (
          <span className={`ml-auto flex items-center gap-0.5 text-xs ${changePositive ? "text-green-400" : "text-red-400"}`}>
            {changePositive ? (
              <IconTrendingUp size={12} />
            ) : change < 0 ? (
              <IconTrendingDown size={12} />
            ) : (
              <IconMinus size={12} />
            )}
            {Math.abs(change).toFixed(1)}
          </span>
        )}
      </div>
      {sparkData.length > 1 && (
        <div className="mt-2">
          <ResponsiveContainer width="100%" height={36}>
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#grad-${label})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + "B"
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "M"
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + "K"
  return v.toFixed(1)
}
