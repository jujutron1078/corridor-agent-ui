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
import { IconPlaneDeparture, IconBed, IconCoin } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ChartWrapper } from "@/components/dashboard/chart-wrapper"
import { DataFreshness } from "@/components/dashboard/data-freshness"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"]

interface TourismCountryData {
  annual_arrivals?: number
  tourism_receipts_usd_million?: number
  average_spending_per_tourist_usd?: number
  hotel_room_capacity?: number
  average_occupancy_rate_percent?: number
  [key: string]: unknown
}

type TourismComparison = Record<string, TourismCountryData>

function fmt(n: number | undefined, decimals = 0): string {
  if (n === undefined || n === null) return "N/A"
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals })
}

export default function TourismPage() {
  const [data, setData] = useState<TourismComparison | null>(null)

  useEffect(() => {
    fetch("/api/tourism/comparison")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
  }, [])

  if (!data) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  const countries = Object.entries(data)

  const hotelCapacityData = countries.map(([iso, d]) => ({
    name: iso,
    capacity: d.hotel_room_capacity ?? 0,
  }))

  const occupancyData = countries.map(([iso, d]) => ({
    name: iso,
    rate: d.average_occupancy_rate_percent ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tourism</h1>
          <p className="text-sm text-muted-foreground">
            Arrivals, receipts, and hospitality capacity across the corridor
          </p>
        </div>
        <DataFreshness date="2019" label="Baseline" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {countries.map(([iso, d]) => (
          <Card key={iso}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{iso}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <IconPlaneDeparture size={16} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Annual Arrivals:</span>
                <span className="font-medium ml-auto">{fmt(d.annual_arrivals)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IconCoin size={16} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Tourism Receipts:</span>
                <span className="font-medium ml-auto">
                  ${fmt(d.tourism_receipts_usd_million, 1)}M
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IconBed size={16} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Avg. Spend/Tourist:</span>
                <span className="font-medium ml-auto">
                  ${fmt(d.average_spending_per_tourist_usd)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartWrapper
          title="Hotel Room Capacity"
          description="Total hotel rooms by country"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={hotelCapacityData}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString(), "Rooms"]} />
              <Bar dataKey="capacity" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper
          title="Average Occupancy Rate"
          description="Hotel occupancy rate (%) by country"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={occupancyData}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, "Occupancy"]} />
              <Bar dataKey="rate" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
    </div>
  )
}
