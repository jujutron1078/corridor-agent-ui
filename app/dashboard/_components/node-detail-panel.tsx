"use client"

import { useEffect, useState } from "react"
import { IconX } from "@tabler/icons-react"

interface NodeDetailPanelProps {
  nodeName: string
  corridor: {
    nodes: { name: string; lon: number; lat: number }[]
    countries: string[]
    country_names: Record<string, string>
  }
  onClose: () => void
}

// Map corridor nodes to their country
const NODE_COUNTRY: Record<string, string> = {
  Lagos: "NGA",
  "Seme Border": "NGA",
  Cotonou: "BEN",
  Hilacondji: "BEN",
  "Lom\u00e9": "TGO",
  Aflao: "GHA",
  Tema: "GHA",
  Accra: "GHA",
  "Cape Coast": "GHA",
  Takoradi: "GHA",
  Axim: "GHA",
  Elubo: "GHA",
  Abidjan: "CIV",
}

// Port nodes that have specific port data
const PORT_NODES = ["Lagos", "Cotonou", "Lom\u00e9", "Tema", "Takoradi", "Abidjan"]

interface PortData {
  port_name: string
  country: string
  container_throughput_teu_year: string
  capacity_utilization_pct: string
  number_of_berths: string
  draft_m: string
  expansion_plans: string
}

interface PolicyData {
  category: string
  title: string
  description: string
}

export function NodeDetailPanel({ nodeName, corridor, onClose }: NodeDetailPanelProps) {
  const [portData, setPortData] = useState<PortData | null>(null)
  const [policies, setPolicies] = useState<PolicyData[]>([])
  const [manufacturing, setManufacturing] = useState<{ name: string; sector: string }[]>([])
  const [loading, setLoading] = useState(true)

  const countryCode = NODE_COUNTRY[nodeName] ?? "GHA"
  const countryName = corridor.country_names?.[countryCode] ?? countryCode
  const isPortNode = PORT_NODES.includes(nodeName)
  const node = corridor.nodes.find((n) => n.name === nodeName)

  useEffect(() => {
    setLoading(true)

    const fetches: Promise<void>[] = []

    // Port data
    if (isPortNode) {
      fetches.push(
        fetch("/api/infrastructure-enriched/ports")
          .then((r) => r.json())
          .then((ports: PortData[]) => {
            const match = ports.find(
              (p) =>
                p.port_name.toLowerCase().includes(nodeName.toLowerCase()) ||
                (nodeName === "Lagos" && p.port_name.includes("Lagos"))
            )
            setPortData(match ?? null)
          })
          .catch(() => setPortData(null))
      )
    }

    // Policy
    fetches.push(
      fetch(`/api/policy/policies?country=${countryCode}`)
        .then((r) => r.json())
        .then((data) => setPolicies(Array.isArray(data) ? data.slice(0, 3) : []))
        .catch(() => setPolicies([]))
    )

    // Manufacturing
    fetches.push(
      fetch(`/api/manufacturing/companies?country=${countryCode}`)
        .then((r) => r.json())
        .then((data) => setManufacturing(Array.isArray(data) ? data.slice(0, 5) : []))
        .catch(() => setManufacturing([]))
    )

    Promise.allSettled(fetches).then(() => setLoading(false))
  }, [nodeName, countryCode, isPortNode])

  return (
    <div className="absolute right-4 top-16 z-30 w-80 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-black/80 p-4 backdrop-blur-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{nodeName}</h3>
          <p className="text-xs text-white/50">
            {countryName} &middot; {node ? `${node.lat.toFixed(2)}\u00b0N, ${Math.abs(node.lon).toFixed(2)}\u00b0${node.lon >= 0 ? "E" : "W"}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <IconX size={16} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Port data */}
          {portData && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                Port
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="Throughput" value={`${Number(portData.container_throughput_teu_year).toLocaleString()} TEU`} />
                <Stat label="Utilization" value={`${portData.capacity_utilization_pct}%`} />
                <Stat label="Berths" value={portData.number_of_berths} />
                <Stat label="Draft" value={`${portData.draft_m}m`} />
              </div>
              {portData.expansion_plans && (
                <p className="mt-2 text-[11px] text-white/40">{portData.expansion_plans}</p>
              )}
            </section>
          )}

          {/* Policy highlights */}
          {policies.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                Policy
              </h4>
              <div className="space-y-1">
                {policies.map((p, i) => (
                  <div key={i} className="rounded bg-white/5 px-2 py-1.5">
                    <div className="text-xs font-medium text-white/80">{p.title || p.category}</div>
                    {p.description && (
                      <div className="mt-0.5 text-[11px] text-white/40 line-clamp-2">{p.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Manufacturing */}
          {manufacturing.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-green-400">
                Manufacturing
              </h4>
              <div className="space-y-1">
                {manufacturing.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-xs">
                    <span className="text-white/70">{m.name}</span>
                    <span className="text-white/40">{m.sector}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fallback for non-port nodes with no extra data */}
          {!isPortNode && policies.length === 0 && manufacturing.length === 0 && (
            <p className="text-xs text-white/30">No detailed data available for this node.</p>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/5 px-2 py-1.5">
      <div className="text-[10px] text-white/40">{label}</div>
      <div className="font-medium tabular-nums text-white/80">{value}</div>
    </div>
  )
}
