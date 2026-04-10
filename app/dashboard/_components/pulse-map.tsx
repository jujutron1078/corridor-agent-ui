"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { MapboxOverlay } from "@deck.gl/mapbox"
import { GeoJsonLayer, ScatterplotLayer, ArcLayer } from "@deck.gl/layers"
import { HeatmapLayer } from "@deck.gl/aggregation-layers"
import type { DashboardSnapshot, LayerVisibility } from "../page"

// ── Commodity color map ──────────────────────────────────────────────────────
const COMMODITY_COLORS: Record<string, [number, number, number]> = {
  cocoa: [139, 69, 19],
  gold: [255, 215, 0],
  oil: [40, 40, 40],
  cotton: [200, 200, 180],
  fish: [65, 105, 225],
  cashew: [210, 140, 60],
  palm_oil: [200, 120, 20],
  rubber: [100, 100, 100],
  cement: [160, 160, 160],
  bauxite: [180, 80, 80],
  manganese: [120, 60, 120],
  timber: [101, 67, 33],
  shea: [240, 220, 170],
  phosphates: [60, 140, 60],
}

const COMMODITY_LABELS: Record<string, string> = {
  cocoa: "Cocoa",
  gold: "Gold",
  oil: "Crude Oil",
  cotton: "Cotton",
  fish: "Fish & Seafood",
  cashew: "Cashew Nuts",
  palm_oil: "Palm Oil",
  rubber: "Rubber",
  cement: "Cement",
  bauxite: "Bauxite",
  manganese: "Manganese",
  timber: "Timber",
  shea: "Shea Butter",
  phosphates: "Phosphates",
}

// ── Investment status colors ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, [number, number, number, number]> = {
  committed: [22, 163, 74, 200],
  pipeline: [217, 119, 6, 200],
  planned: [99, 102, 241, 200],
}

const STATUS_LABELS: Record<string, string> = {
  committed: "Committed",
  pipeline: "In Pipeline",
  planned: "Planned",
}

// ── Heatmap color range ────────────────────────────────────────────────────
const HEATMAP_COLORS: [number, number, number, number][] = [
  [255, 255, 178, 25],
  [254, 204, 92, 100],
  [253, 141, 60, 150],
  [240, 59, 32, 200],
  [189, 0, 38, 230],
]

// ── Carto Dark Matter base style ────────────────────────────────────────────
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; CARTO &copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "carto-dark", type: "raster", source: "carto-dark" }],
}

interface PulseMapProps {
  data: DashboardSnapshot | null
  layers: LayerVisibility
  loading: boolean
  onNodeClick: (nodeName: string) => void
}

// ── Format helpers ──────────────────────────────────────────────────────────
function fmtUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`
}

// ── Tooltip HTML generators ────────────────────────────────────────────────
function fmtWeight(kg: number): string {
  if (!kg || kg <= 0) return "N/A"
  if (kg >= 1e9) return `${(kg / 1e9).toFixed(1)}M tonnes`
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(1)}K tonnes`
  if (kg >= 1e3) return `${(kg / 1e3).toFixed(0)} tonnes`
  return `${kg.toFixed(0)} kg`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tradeArcTooltip(d: any): string {
  const color = COMMODITY_COLORS[d.commodity] ?? [100, 180, 255]
  const hex = rgbToHex(...(color as [number, number, number]))
  const processing = d.processing_stage && d.processing_stage !== "unknown"
    ? d.processing_stage.charAt(0).toUpperCase() + d.processing_stage.slice(1)
    : null
  const processingColor = processing === "Raw" ? "#f87171" : processing === "Processed" ? "#4ade80" : "#9ca3af"
  return `
    <div style="min-width:200px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="width:10px;height:10px;border-radius:50%;background:${hex};display:inline-block"></span>
        <strong>${COMMODITY_LABELS[d.commodity] ?? d.commodity}</strong>
      </div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11px">
        <span style="color:#9ca3af">From</span><span>${d.reporter_name ?? "—"}</span>
        <span style="color:#9ca3af">To</span><span>${d.target_name ?? "—"}</span>
        <span style="color:#9ca3af">Flow</span><span style="text-transform:capitalize">${d.flow}</span>
        <span style="color:#9ca3af">Value</span><span>${fmtUsd(d.value_usd)}</span>
        <span style="color:#9ca3af">Quantity</span><span>${fmtWeight(d.weight_kg ?? 0)}</span>
        ${processing ? `<span style="color:#9ca3af">Type</span><span style="color:${processingColor};font-weight:500">${processing}</span>` : ""}
        <span style="color:#9ca3af">Year</span><span>${d.year}</span>
      </div>
    </div>
  `
}

function investmentTooltip(d: DashboardSnapshot["investments"][0]): string {
  const statusColor =
    d.status === "committed" ? "#22c55e" : d.status === "pipeline" ? "#f59e0b" : "#818cf8"
  return `
    <div style="min-width:200px">
      <strong style="display:block;margin-bottom:4px;line-height:1.3">${d.name}</strong>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11px">
        <span style="color:#9ca3af">Sector</span><span>${d.sector}</span>
        <span style="color:#9ca3af">Cost</span><span>${d.cost_usd ? fmtUsd(d.cost_usd) : "N/A"}</span>
        <span style="color:#9ca3af">Status</span>
        <span style="color:${statusColor}">${STATUS_LABELS[d.status] ?? d.status}</span>
        ${d.financier ? `<span style="color:#9ca3af">Financier</span><span>${d.financier}</span>` : ""}
        ${d.year ? `<span style="color:#9ca3af">Start</span><span>${d.year}</span>` : ""}
      </div>
    </div>
  `
}

function nodeTooltip(d: { name: string; lon: number; lat: number }): string {
  return `
    <div>
      <strong>${d.name}</strong>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px">
        ${d.lat.toFixed(2)}\u00b0N, ${Math.abs(d.lon).toFixed(2)}\u00b0${d.lon >= 0 ? "E" : "W"}
      </div>
      <div style="font-size:10px;color:#60a5fa;margin-top:4px">Click for details</div>
    </div>
  `
}

function conflictTooltip(d: DashboardSnapshot["conflict_events"][0]): string {
  return `
    <div style="min-width:160px">
      <strong style="color:#f87171">${d.event_type || "Conflict Event"}</strong>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11px;margin-top:4px">
        <span style="color:#9ca3af">Fatalities</span><span>${d.fatalities}</span>
        <span style="color:#9ca3af">Date</span><span>${d.date}</span>
      </div>
    </div>
  `
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTooltipHtml(layerId: string, object: any): string | null {
  if (!object) return null
  switch (layerId) {
    case "trade-arcs":
      return tradeArcTooltip(object)
    case "investment-markers":
      return investmentTooltip(object)
    case "corridor-nodes":
      return nodeTooltip(object)
    case "conflict-points":
      return conflictTooltip(object)
    default:
      return null
  }
}

/**
 * Build all Deck.gl layers from data + visibility. Pure function, no React state.
 */
function buildLayers(
  data: DashboardSnapshot | null,
  layers: LayerVisibility,
  onNodeClick: (name: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  if (!data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = []

  // Corridor buffer polygon
  if (layers.corridor && data.corridor.aoi_geojson) {
    result.push(
      new GeoJsonLayer({
        id: "corridor-buffer",
        data: data.corridor.aoi_geojson as unknown as GeoJSON.GeoJSON,
        filled: true,
        stroked: true,
        getFillColor: [59, 130, 246, 25],
        getLineColor: [59, 130, 246, 120],
        getLineWidth: 2,
        lineWidthUnits: "pixels" as const,
        pickable: false,
      })
    )
  }

  // Corridor centerline
  if (layers.corridor && data.corridor.centerline?.length) {
    result.push(
      new GeoJsonLayer({
        id: "corridor-centerline",
        data: {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: data.corridor.centerline,
          },
          properties: {},
        },
        stroked: true,
        filled: false,
        getLineColor: [59, 130, 246, 200],
        getLineWidth: 3,
        lineWidthUnits: "pixels" as const,
        pickable: false,
      })
    )
  }

  // Trade arcs
  if (layers.tradeFlows && data.trade_arcs?.length) {
    const maxValue = Math.max(...data.trade_arcs.map((a) => a.value_usd))

    result.push(
      new ArcLayer({
        id: "trade-arcs",
        data: data.trade_arcs,
        getSourcePosition: (d: (typeof data.trade_arcs)[0]) => d.source,
        getTargetPosition: (d: (typeof data.trade_arcs)[0]) => d.target,
        getSourceColor: (d: (typeof data.trade_arcs)[0]) => [
          ...(COMMODITY_COLORS[d.commodity] ?? [100, 180, 255]),
          200,
        ],
        getTargetColor: (d: (typeof data.trade_arcs)[0]) => [
          ...(COMMODITY_COLORS[d.commodity] ?? [100, 180, 255]),
          60,
        ],
        getWidth: (d: (typeof data.trade_arcs)[0]) =>
          1 + Math.sqrt(d.value_usd / maxValue) * 8,
        getHeight: 0.3,
        greatCircle: true,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 80],
      })
    )
  }

  // Investment markers — pixel-based so they stay small at any zoom
  if (layers.investments && data.investments?.length) {
    const maxCost = Math.max(
      ...data.investments.map((d) => d.cost_usd ?? 0),
      1
    )
    result.push(
      new ScatterplotLayer({
        id: "investment-markers",
        data: data.investments,
        getPosition: (d: (typeof data.investments)[0]) => d.position,
        getRadius: (d: (typeof data.investments)[0]) => {
          const cost = d.cost_usd ?? 0
          return 4 + Math.sqrt(cost / maxCost) * 16
        },
        radiusUnits: "pixels" as const,
        radiusMinPixels: 4,
        radiusMaxPixels: 24,
        getFillColor: (d: (typeof data.investments)[0]) =>
          STATUS_COLORS[d.status] ?? [99, 102, 241, 200],
        stroked: true,
        getLineColor: [255, 255, 255, 120],
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 80],
      })
    )
  }

  // Conflict events as pickable points (for tooltips) layered under heatmap
  if (layers.conflict && data.conflict_events?.length) {
    result.push(
      new ScatterplotLayer({
        id: "conflict-points",
        data: data.conflict_events,
        getPosition: (d: (typeof data.conflict_events)[0]) => d.position,
        getRadius: 3000,
        getFillColor: [240, 59, 32, 0], // invisible fill — heatmap provides color
        radiusUnits: "meters" as const,
        pickable: true,
        autoHighlight: true,
        highlightColor: [240, 59, 32, 100],
      })
    )

    result.push(
      new HeatmapLayer({
        id: "conflict-heatmap",
        data: data.conflict_events,
        getPosition: (d: (typeof data.conflict_events)[0]) => d.position,
        getWeight: (d: (typeof data.conflict_events)[0]) => d.fatalities + 1,
        radiusPixels: 40,
        intensity: 1.5,
        threshold: 0.05,
        colorRange: HEATMAP_COLORS,
        weightsTextureSize: 512,
        pickable: false,
      })
    )
  }

  // Corridor nodes
  if (layers.nodes && data.corridor.nodes?.length) {
    result.push(
      new ScatterplotLayer({
        id: "corridor-nodes",
        data: data.corridor.nodes,
        getPosition: (d: { lon: number; lat: number }): [number, number] => [
          d.lon,
          d.lat,
        ],
        getRadius: 6000,
        getFillColor: [255, 255, 255, 200],
        stroked: true,
        getLineColor: [59, 130, 246, 255],
        lineWidthMinPixels: 2,
        radiusUnits: "meters" as const,
        pickable: true,
        autoHighlight: true,
        highlightColor: [59, 130, 246, 120],
        onClick: (info: { object?: { name: string } }) => {
          if (info.object?.name) onNodeClick(info.object.name)
        },
      })
    )
  }

  return result
}

export function PulseMap({ data, layers, loading, onNodeClick }: PulseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  // ── Initialize map (runs once) ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [-0.3, 6.0],
      zoom: 5.5,
      minZoom: 1,
      maxZoom: 12,
      attributionControl: false,
    })

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right"
    )

    mapRef.current = map

    const onLoad = () => {
      const overlay = new MapboxOverlay({ interleaved: true, layers: [] })
      map.addControl(overlay)
      overlayRef.current = overlay
      setIsMapReady(true)
    }

    map.on("load", onLoad)

    return () => {
      map.off("load", onLoad)
      popupRef.current?.remove()
      hoverPopupRef.current?.remove()
      overlayRef.current = null
      map.remove()
      mapRef.current = null
      setIsMapReady(false)
    }
  }, [])

  // ── Nightlights raster layer (managed by MapLibre, not Deck.gl) ────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    const tileUrl = data?.nightlights_tile_url
    const sourceId = "nightlights"
    const layerId = "nightlights-layer"

    if (map.getLayer(layerId)) map.removeLayer(layerId)
    if (map.getSource(sourceId)) map.removeSource(sourceId)

    if (tileUrl && layers.nightlights) {
      // NASA GIBS tiles max out at zoom 8; GEE tiles go higher
      const isGibs = tileUrl.includes("gibs.earthdata.nasa.gov")
      map.addSource(sourceId, {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: 1,
        maxzoom: isGibs ? 8 : 12,
      })
      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: { "raster-opacity": 0.7 },
        },
        // Insert nightlights above base tiles but below Deck.gl layers
        undefined
      )
    }
  }, [data?.nightlights_tile_url, layers.nightlights, isMapReady])

  // ── Update Deck.gl layers when data or visibility changes ──────────────
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay || !isMapReady) return

    const deckLayers = buildLayers(data, layers, onNodeClick)
    overlay.setProps({ layers: deckLayers })
  }, [data, layers, isMapReady, onNodeClick])

  // ── Clear popups when data changes ─────────────────────────────────────
  useEffect(() => {
    popupRef.current?.remove()
    popupRef.current = null
    hoverPopupRef.current?.remove()
    hoverPopupRef.current = null
  }, [data])

  // ── Hover tooltip ──────────────────────────────────────────────────────
  const handleMouseMove = useCallback((event: maplibregl.MapMouseEvent) => {
    const map = mapRef.current
    const overlay = overlayRef.current
    if (!map || !overlay) return

    const picked = overlay.pickObject({
      x: event.point.x,
      y: event.point.y,
      radius: 6,
    })

    const html = getTooltipHtml(picked?.layer?.id ?? "", picked?.object)

    if (!html) {
      hoverPopupRef.current?.remove()
      hoverPopupRef.current = null
      map.getCanvas().style.cursor = ""
      return
    }

    map.getCanvas().style.cursor = "pointer"

    if (!hoverPopupRef.current) {
      hoverPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "280px",
        offset: 12,
        className: "dashboard-tooltip",
      })
    }

    hoverPopupRef.current
      .setLngLat([event.lngLat.lng, event.lngLat.lat])
      .setHTML(
        `<div style="font-size:12px;line-height:1.5;color:#e5e7eb">${html}</div>`
      )
      .addTo(map)
  }, [])

  // ── Click popup (more detailed, sticky) ────────────────────────────────
  const handleClick = useCallback(
    (event: maplibregl.MapMouseEvent) => {
      const map = mapRef.current
      const overlay = overlayRef.current
      if (!map || !overlay) return

      const picked = overlay.pickObject({
        x: event.point.x,
        y: event.point.y,
        radius: 6,
      })

      const html = getTooltipHtml(picked?.layer?.id ?? "", picked?.object)

      if (!html) {
        popupRef.current?.remove()
        popupRef.current = null
        return
      }

      // For corridor nodes, the onClick handler in the layer fires onNodeClick.
      // Still show a popup for other layer types.
      if (picked?.layer?.id === "corridor-nodes") return

      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "320px",
        offset: 12,
        className: "dashboard-popup",
      })
        .setLngLat([event.lngLat.lng, event.lngLat.lat])
        .setHTML(
          `<div style="font-size:12px;line-height:1.5;color:#e5e7eb">${html}</div>`
        )
        .addTo(map)
    },
    []
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return
    map.on("mousemove", handleMouseMove)
    map.on("click", handleClick)
    return () => {
      map.off("mousemove", handleMouseMove)
      map.off("click", handleClick)
    }
  }, [isMapReady, handleMouseMove, handleClick])

  return (
    <>
      {/* Tooltip/popup styles — dark theme to match the map */}
      <style jsx global>{`
        .dashboard-tooltip .maplibregl-popup-content,
        .dashboard-popup .maplibregl-popup-content {
          background: rgba(15, 15, 20, 0.92);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        .dashboard-tooltip .maplibregl-popup-tip,
        .dashboard-popup .maplibregl-popup-tip {
          border-top-color: rgba(15, 15, 20, 0.92);
          border-bottom-color: rgba(15, 15, 20, 0.92);
        }
        .dashboard-popup .maplibregl-popup-close-button {
          color: #9ca3af;
          font-size: 16px;
          padding: 2px 6px;
        }
        .dashboard-popup .maplibregl-popup-close-button:hover {
          color: #fff;
          background: transparent;
        }
      `}</style>

      <div ref={containerRef} className="h-full w-full">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-lg bg-black/60 px-5 py-3 text-white/60">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
              Loading corridor data...
            </div>
          </div>
        )}
      </div>
    </>
  )
}
