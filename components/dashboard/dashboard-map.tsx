"use client"

import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers"
import { MapboxOverlay } from "@deck.gl/mapbox"
import type { Feature, FeatureCollection } from "geojson"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// Corridor center: West Africa coast
const DEFAULT_CENTER: [number, number] = [-0.3, 6.0]
const DEFAULT_ZOOM = 5.5

const LAYER_COLORS: Record<string, [number, number, number, number]> = {
  boundaries: [100, 100, 100, 40],
  airports: [37, 99, 235, 200],
  ports: [22, 163, 74, 200],
  power_plants: [234, 179, 8, 200],
  railways: [124, 58, 237, 160],
  transmission_lines: [249, 115, 22, 120],
  industrial_zones: [236, 72, 153, 140],
  mining_sites: [168, 85, 247, 180],
  border_crossings: [220, 38, 38, 200],
  cities: [15, 23, 42, 220],
  default: [59, 130, 246, 180],
}

export interface MapLayer {
  id: string
  label: string
  data: FeatureCollection | null
  visible?: boolean
  color?: [number, number, number, number]
  type?: "fill" | "line" | "point" | "circle"
  pointRadius?: number
}

interface DashboardMapProps {
  title: string
  description?: string
  layers: MapLayer[]
  height?: string
  center?: [number, number]
  zoom?: number
}

function ensureMapLibreCss() {
  if (typeof document === "undefined") return
  if (document.getElementById("maplibre-css-dashboard")) return
  const link = document.createElement("link")
  link.id = "maplibre-css-dashboard"
  link.rel = "stylesheet"
  link.href = "https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.css"
  document.head.appendChild(link)
}

export function DashboardMap({
  title,
  description,
  layers,
  height = "500px",
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
}: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    layers.forEach((l) => { initial[l.id] = l.visible !== false })
    return initial
  })

  // Initialize map
  useEffect(() => {
    ensureMapLibreCss()
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: center,
      zoom: zoom,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    })

    map.addControl(new maplibregl.NavigationControl(), "top-right")

    map.on("load", () => {
      const overlay = new MapboxOverlay({ interleaved: true, layers: [] })
      map.addControl(overlay)
      overlayRef.current = overlay
      mapRef.current = map
      setIsReady(true)
    })

    return () => {
      overlayRef.current = null
      map.remove()
      mapRef.current = null
      setIsReady(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update Deck.GL layers when data or visibility changes
  useEffect(() => {
    if (!isReady || !overlayRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deckLayers: any[] = []

    for (const layer of layers) {
      if (!visibleLayers[layer.id] || !layer.data?.features?.length) continue

      const color = layer.color || LAYER_COLORS[layer.id] || LAYER_COLORS.default
      const geomType = layer.data.features[0]?.geometry?.type || ""

      if (layer.type === "fill" || geomType === "Polygon" || geomType === "MultiPolygon") {
        deckLayers.push(
          new GeoJsonLayer({
            id: `dashboard-${layer.id}`,
            data: layer.data,
            filled: true,
            stroked: true,
            getFillColor: [color[0], color[1], color[2], 40],
            getLineColor: [color[0], color[1], color[2], 160],
            getLineWidth: 1,
            lineWidthMinPixels: 1,
            pickable: true,
          })
        )
      } else if (layer.type === "line" || geomType === "LineString" || geomType === "MultiLineString") {
        deckLayers.push(
          new GeoJsonLayer({
            id: `dashboard-${layer.id}`,
            data: layer.data,
            filled: false,
            stroked: true,
            getLineColor: color,
            getLineWidth: 2,
            lineWidthMinPixels: 1,
            pickable: true,
          })
        )
      } else {
        // Points
        deckLayers.push(
          new GeoJsonLayer({
            id: `dashboard-${layer.id}`,
            data: layer.data,
            filled: true,
            stroked: true,
            pointRadiusMinPixels: layer.pointRadius || 4,
            pointRadiusMaxPixels: layer.pointRadius ? layer.pointRadius * 2 : 12,
            getFillColor: color,
            getLineColor: [255, 255, 255, 200],
            getLineWidth: 1,
            lineWidthMinPixels: 1,
            pickable: true,
          })
        )
      }
    }

    overlayRef.current.setProps({ layers: deckLayers })
  }, [layers, visibleLayers, isReady])

  const toggleLayer = (id: string) => {
    setVisibleLayers((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
        {/* Layer toggles */}
        <div className="flex flex-wrap gap-2 pt-2">
          {layers.map((layer) => {
            const color = layer.color || LAYER_COLORS[layer.id] || LAYER_COLORS.default
            const isVisible = visibleLayers[layer.id]
            return (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isVisible
                    ? "border-transparent bg-primary/10 text-primary"
                    : "border-muted bg-muted/30 text-muted-foreground line-through"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: `rgba(${color[0]},${color[1]},${color[2]},${isVisible ? 1 : 0.3})`,
                  }}
                />
                {layer.label}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} style={{ height, width: "100%" }} className="rounded-b-xl" />
      </CardContent>
    </Card>
  )
}
