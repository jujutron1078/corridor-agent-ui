"use client"

import { useState } from "react"
import {
  IconStack2,
  IconFlame,
  IconArrowsExchange,
  IconCoin,
  IconRoute,
  IconMapPin,
  IconBulb,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import type { LayerVisibility } from "../page"

interface LayerControlsProps {
  layers: LayerVisibility
  onToggle: (key: keyof LayerVisibility) => void
}

const LAYER_CONFIG: {
  key: keyof LayerVisibility
  label: string
  icon: typeof IconStack2
  color: string
}[] = [
  { key: "nightlights", label: "Nightlights", icon: IconBulb, color: "#fbbf24" },
  { key: "tradeFlows", label: "Trade Flows", icon: IconArrowsExchange, color: "#60a5fa" },
  { key: "investments", label: "Investments", icon: IconCoin, color: "#34d399" },
  { key: "conflict", label: "Conflict", icon: IconFlame, color: "#f87171" },
  { key: "corridor", label: "Corridor", icon: IconRoute, color: "#3b82f6" },
  { key: "nodes", label: "Nodes", icon: IconMapPin, color: "#ffffff" },
]

export function LayerControls({ layers, onToggle }: LayerControlsProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="absolute right-4 top-4 z-20 rounded-xl bg-black/70 backdrop-blur-md">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:text-white/80"
      >
        <IconStack2 size={14} />
        <span>Layers</span>
        {collapsed ? <IconChevronDown size={12} className="ml-auto" /> : <IconChevronUp size={12} className="ml-auto" />}
      </button>

      {/* Layer toggles */}
      {!collapsed && (
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {LAYER_CONFIG.map(({ key, label, icon: Icon, color }) => {
            const active = layers[key]
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:bg-white/5 hover:text-white/50"
                }`}
              >
                <Icon size={14} style={{ color: active ? color : undefined }} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
