"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { useDataLayersContext } from "@/hooks/data-layers-context";
import { DATA_LAYERS, DATA_LAYER_GROUPS } from "@/lib/data-layers";

const MapPanel = dynamic(
  () => import("@/components/map-panel").then((mod) => mod.MapPanel),
  { ssr: false }
);

// Sector color map (must match data-layers.ts colorBy for projects)
const SECTOR_COLORS: Record<string, [number, number, number]> = {
  Transport: [59, 130, 246],
  "Urban Transport": [99, 102, 241],
  Logistics: [234, 88, 12],
  "Ports/Waterways": [37, 99, 235],
  Energy: [250, 204, 21],
  "Energy Transmission And Distribution": [250, 204, 21],
  "Other Energy And Extractives": [234, 179, 8],
  "Renewable Energy": [34, 197, 94],
  "Agro-Industry": [22, 163, 74],
  Trade: [168, 85, 247],
  Digital: [6, 182, 212],
  "Water Supply": [56, 189, 248],
  "Social Protection": [244, 114, 182],
};
const FALLBACK_COLOR: [number, number, number] = [148, 163, 184];

export function InteractiveMapView() {
  const [showLayers, setShowLayers] = useState(false);
  const ctx = useDataLayersContext();

  // Extract unique sectors from the loaded projects data
  const projectSectors = useMemo(() => {
    if (!ctx) return [];
    const projectState = ctx.store["projects"];
    if (!projectState?.data?.features) return [];
    const counts: Record<string, number> = {};
    for (const f of projectState.data.features) {
      const sector = String(f.properties?.sector ?? "Other");
      counts[sector] = (counts[sector] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([sector, count]) => ({
        sector,
        count,
        color: SECTOR_COLORS[sector] ?? FALLBACK_COLOR,
      }))
      .sort((a, b) => b.count - a.count);
  }, [ctx?.store["projects"]?.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilter = ctx?.projectSectorFilter ?? new Set<string>();
  const statusFilter = ctx?.projectStatusFilter ?? new Set<string>();
  const hasFilter = activeFilter.size > 0;
  const hasStatusFilter = statusFilter.size > 0;

  // Extract unique statuses
  const projectStatuses = useMemo(() => {
    if (!ctx) return [];
    const projectState = ctx.store["projects"];
    if (!projectState?.data?.features) return [];
    const counts: Record<string, number> = {};
    for (const f of projectState.data.features) {
      const status = String(f.properties?.status ?? "Unknown");
      counts[status] = (counts[status] ?? 0) + 1;
    }
    const STATUS_COLORS: Record<string, string> = {
      Active: "#22c55e", Closed: "#64748b", Proposed: "#f59e0b",
      "Under Preparation": "#3b82f6", Dropped: "#ef4444", Unknown: "#a1a1aa",
    };
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count, color: STATUS_COLORS[status] ?? "#a1a1aa" }))
      .sort((a, b) => b.count - a.count);
  }, [ctx?.store["projects"]?.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build legend entries from active layers
  const legendEntries: { color: [number, number, number]; label: string }[] = [];
  if (ctx) {
    for (const cfg of DATA_LAYERS) {
      if (!ctx.store[cfg.id]?.active) continue;
      if (cfg.id === "projects") continue; // legend is the filter bar itself
      if (cfg.geometryType === "raster") {
        legendEntries.push({ color: cfg.color, label: cfg.label });
      } else if (cfg.colorBy) {
        for (const [val, col] of Object.entries(cfg.colorBy.map)) {
          legendEntries.push({ color: col, label: `${cfg.label}: ${val}` });
        }
      } else {
        legendEntries.push({ color: cfg.color, label: cfg.label });
      }
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Sector filter bar */}
      {projectSectors.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border bg-background/95 px-3 py-1.5 overflow-x-auto [scrollbar-width:thin]">
          {/* "All" chip */}
          <button
            type="button"
            onClick={() => { ctx?.clearProjectSectorFilter(); ctx?.clearProjectStatusFilter(); }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              !hasFilter && !hasStatusFilter
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            All
            <span className="text-[10px] tabular-nums opacity-70">
              {projectSectors.reduce((s, d) => s + d.count, 0)}
            </span>
          </button>

          <div className="mx-1 h-4 w-px shrink-0 bg-border" />

          {/* Status chips */}
          {projectStatuses.map(({ status, count, color }) => {
            const isActive = statusFilter.has(status);
            return (
              <button
                key={`status-${status}`}
                type="button"
                onClick={() => ctx?.toggleProjectStatus(status)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  isActive
                    ? "border-transparent text-white"
                    : hasStatusFilter
                      ? "border-border text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
                      : "border-border text-foreground hover:bg-muted/50"
                }`}
                style={isActive ? { backgroundColor: color } : undefined}
              >
                <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                {status}
                <span className="text-[10px] tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}

          <div className="mx-1 h-4 w-px shrink-0 bg-border" />

          {/* Sector chips */}
          {projectSectors.map(({ sector, count, color }) => {
            const isActive = activeFilter.has(sector);
            const rgb = `rgb(${color[0]},${color[1]},${color[2]})`;
            return (
              <button
                key={sector}
                type="button"
                onClick={() => ctx?.toggleProjectSector(sector)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  isActive
                    ? "border-transparent text-white"
                    : hasFilter
                      ? "border-border text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
                      : "border-border text-foreground hover:bg-muted/50"
                }`}
                style={isActive ? { backgroundColor: rgb } : undefined}
              >
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: rgb }}
                />
                {sector}
                <span className="text-[10px] tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Map area */}
      <div className="relative min-h-0 flex-1">
        <MapPanel data={null} hideDataLayers corridorLine />

        {/* Floating layer toggle button */}
        <button
          type="button"
          onClick={() => setShowLayers((p) => !p)}
          className="absolute left-3 top-3 z-[520] flex items-center gap-1.5 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm transition hover:bg-muted/80"
        >
          <Layers className="size-4" />
          Data Layers
        </button>

        {/* Floating layers panel */}
        {showLayers && ctx && (
          <div className="absolute left-3 top-14 z-[520] w-[260px] max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-background/95 p-3 text-xs shadow-xl backdrop-blur-sm">
            {DATA_LAYER_GROUPS.map((grp) => {
              const groupLayers = DATA_LAYERS.filter((l) => l.group === grp.key);
              return (
                <div key={grp.key} className="mb-3 last:mb-0">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {grp.label}
                  </div>
                  <div className="space-y-0.5">
                    {groupLayers.map((layer) => {
                      const state = ctx.store[layer.id];
                      const isActive = state?.active ?? false;
                      const isLoading = state?.loading ?? false;
                      const count = state?.featureCount ?? 0;
                      return (
                        <button
                          key={layer.id}
                          type="button"
                          onClick={() => ctx.toggleLayer(layer.id)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${
                            isActive ? "bg-muted/80" : "hover:bg-muted/40"
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                          ) : (
                            <span
                              className={`inline-block size-3 shrink-0 rounded-sm border ${isActive ? "border-transparent" : "border-border"}`}
                              style={isActive ? { backgroundColor: `rgb(${layer.color[0]},${layer.color[1]},${layer.color[2]})` } : undefined}
                            />
                          )}
                          <span className="flex-1 text-[12px]">{layer.label}</span>
                          {isActive && count > 0 && (
                            <span className="text-[10px] tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating legend — bottom-right */}
        {legendEntries.length > 0 && (
          <div className="absolute bottom-4 right-4 z-[520] max-h-[50vh] w-[200px] overflow-y-auto rounded-xl border border-border bg-background/95 p-3 text-xs shadow-xl backdrop-blur-sm">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block h-[3px] w-4 shrink-0 rounded-full" style={{ backgroundColor: "rgb(234,179,8)" }} />
                <span className="text-[11px]">Corridor Route</span>
              </div>
              {legendEntries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: `rgb(${entry.color[0]},${entry.color[1]},${entry.color[2]})` }}
                  />
                  <span className="text-[11px]">{entry.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
