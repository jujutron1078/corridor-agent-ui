"use client";

import { useEffect, useRef, useState } from "react";

import type { MapOverlayData, NoGoZone, RouteVariant } from "@/lib/map-overlay";

type LeafletLike = {
  map: (container: HTMLElement, options?: Record<string, unknown>) => LeafletMapLike;
  tileLayer: (
    urlTemplate: string,
    options?: Record<string, unknown>
  ) => { addTo: (map: LeafletMapLike) => void };
  layerGroup: () => LeafletLayerGroupLike;
  marker: (latlng: [number, number]) => { bindPopup: (html: string) => unknown };
  circleMarker: (
    latlng: [number, number],
    options?: Record<string, unknown>
  ) => { bindPopup: (html: string) => unknown };
  polyline: (
    latlngs: [number, number][],
    options?: Record<string, unknown>
  ) => LeafletBoundsLayerLike;
  polygon: (
    latlngs: [number, number][],
    options?: Record<string, unknown>
  ) => LeafletBoundsLayerLike;
  latLngBounds: (
    latlngs: [number, number][]
  ) => { isValid: () => boolean; pad: (ratio: number) => unknown };
};

type LeafletMapLike = {
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => void;
  setView: (latlng: [number, number], zoom: number) => void;
  invalidateSize?: (options?: Record<string, unknown> | boolean) => void;
  remove: () => void;
};

type LeafletLayerGroupLike = {
  addTo: (map: LeafletMapLike) => LeafletLayerGroupLike;
  clearLayers: () => void;
  addLayer: (layer: unknown) => void;
};

type LeafletBoundsLayerLike = {
  getBounds: () => { isValid: () => boolean; pad: (ratio: number) => unknown };
  bindPopup?: (html: string) => unknown;
};

declare global {
  interface Window {
    L?: LeafletLike;
  }
}

const DEFAULT_CENTER: [number, number] = [6.0, -0.3];
const DEFAULT_ZOOM = 5;
const LEAFLET_CSS_ID = "leaflet-css";
const LEAFLET_SCRIPT_ID = "leaflet-script";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadLeafletAssets(onReady: () => void) {
  if (typeof window === "undefined") return;

  if (window.L) {
    onReady();
    return;
  }

  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const cssLink = document.createElement("link");
    cssLink.id = LEAFLET_CSS_ID;
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);
  }

  const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    existingScript.addEventListener("load", onReady, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = LEAFLET_SCRIPT_ID;
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.async = true;
  script.addEventListener("load", onReady, { once: true });
  document.body.appendChild(script);
}

function getRiskWeight(floodRisk: string | undefined): number {
  const normalized = (floodRisk ?? "").toLowerCase();
  if (normalized.includes("critical")) return 10;
  if (normalized.includes("high")) return 8;
  if (normalized.includes("medium")) return 5;
  if (normalized.includes("low")) return 2;
  return 1;
}

function getTerrainColor(score: number | undefined, floodRisk: string | undefined): string {
  const difficulty = Math.max(1, Math.min(10, score ?? getRiskWeight(floodRisk)));
  if (difficulty <= 3) return "#16a34a";
  if (difficulty <= 6) return "#eab308";
  if (difficulty <= 8) return "#f97316";
  return "#dc2626";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/** Infrastructure marker style: ⚡ Yellow / 🏭 Orange / 🚢 Blue / ⛏ Brown / 🔲 Purple square + confidence ring (solid = auto-verified, dashed = manual review). */
function getInfrastructureStyle(type: string): {
  color: string;
  isSquare: boolean;
  typeLabel: string;
} {
  const normalized = type.toLowerCase();

  // ⚡ Yellow circle → Power plant / generation asset
  if (
    normalized.includes("power_plant") ||
    normalized.includes("generation") ||
    normalized.includes("generation_asset") ||
    normalized.includes("hydroelectric") ||
    normalized.includes("solar_farm")
  ) {
    return { color: "#facc15", isSquare: false, typeLabel: "Power / Generation" };
  }

  // 🏭 Orange circle → Industrial complex / SEZ (incl. refinery)
  if (
    normalized.includes("industrial") ||
    normalized.includes("special_economic_zone") ||
    normalized.includes("sez") ||
    normalized.includes("oil_refinery") ||
    normalized.includes("refinery")
  ) {
    return { color: "#f97316", isSquare: false, typeLabel: "Industrial / SEZ" };
  }

  // 🚢 Blue circle → Port facility
  if (normalized.includes("port")) {
    return { color: "#3b82f6", isSquare: false, typeLabel: "Port Facility" };
  }

  // ⛏ Brown circle → Mining operation
  if (normalized.includes("mining") || normalized.includes("mine")) {
    return { color: "#92400e", isSquare: false, typeLabel: "Mining" };
  }

  // 🔲 Purple square → Data center / substation
  if (normalized.includes("data_center") || normalized.includes("substation")) {
    return { color: "#7e22ce", isSquare: true, typeLabel: "Data Center / Substation" };
  }

  return { color: "#22c55e", isSquare: false, typeLabel: "Infrastructure" };
}

function getConstraintStyle(zone: NoGoZone): {
  stroke: string;
  fill: string;
  opacity: number;
  label: string;
} {
  const normalized = `${zone.severity ?? ""} ${zone.reason ?? ""} ${zone.description}`.toLowerCase();

  // Red filled polygon (opacity 0.35) → ABSOLUTE NO-GO / Critical (Ankasa, Keta Lagoon)
  if (
    normalized.includes("absolute") ||
    normalized.includes("no-go") ||
    normalized.includes("no go") ||
    normalized.includes("critical")
  ) {
    return {
      stroke: "#7f1d1d",
      fill: "#dc2626",
      opacity: 0.35,
      label: "Absolute no-go",
    };
  }

  // Orange filled polygon (opacity 0.25) → HIGH risk / re-route required
  if (normalized.includes("high") || normalized.includes("hard no-go")) {
    return {
      stroke: "#9a3412",
      fill: "#f97316",
      opacity: 0.25,
      label: "High risk",
    };
  }

  // Yellow filled polygon (opacity 0.20) → MEDIUM risk / mitigation required
  return {
    stroke: "#a16207",
    fill: "#facc15",
    opacity: 0.2,
    label: "Medium risk",
  };
}

function getRecommendedVariant(routeVariants: RouteVariant[]): RouteVariant | null {
  if (routeVariants.length === 0) return null;
  return (
    routeVariants.find((variant) => variant.isRecommended) ??
    routeVariants
      .filter((variant) => typeof variant.rank === "number")
      .sort((left, right) => (left.rank ?? 999) - (right.rank ?? 999))[0] ??
    routeVariants[0]
  );
}

/** Route optimization polyline style: Blue thick (V1), Orange/Green medium (V2/V3), Red thin dashed (V4/V5). */
function getRouteVariantStyle(rank: number): {
  color: string;
  weight: number;
  dashArray: string | undefined;
  label: string;
} {
  switch (rank) {
    case 1:
      return { color: "#2563eb", weight: 6, dashArray: undefined, label: "ROUTE-V1 Recommended" };
    case 2:
      return { color: "#f97316", weight: 4, dashArray: undefined, label: "ROUTE-V2 Inland detour" };
    case 3:
      return { color: "#16a34a", weight: 4, dashArray: undefined, label: "ROUTE-V3 Shortest path" };
    default:
      return {
        color: "#dc2626",
        weight: 2,
        dashArray: "8 6",
        label: `ROUTE-V${rank} lower ranked`,
      };
  }
}

function circlePolygon(center: [number, number], radiusKm: number): [number, number][] {
  const points: [number, number][] = [];
  const [lat, lng] = center;
  const latOffset = radiusKm / 111;
  const lngOffset = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));

  for (let degree = 0; degree < 360; degree += 12) {
    const radians = (degree * Math.PI) / 180;
    points.push([
      lat + latOffset * Math.sin(radians),
      lng + lngOffset * Math.cos(radians),
    ]);
  }

  return points;
}

function squareAroundPoint(center: [number, number], halfSideKm: number): [number, number][] {
  const [lat, lng] = center;
  const latOffset = halfSideKm / 111;
  const lngOffset = halfSideKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));

  return [
    [lat + latOffset, lng - lngOffset],
    [lat + latOffset, lng + lngOffset],
    [lat - latOffset, lng + lngOffset],
    [lat - latOffset, lng - lngOffset],
  ];
}

type MapPanelProps = {
  data?: MapOverlayData | null;
};

type LayerVisibility = {
  corridor: boolean;
  environmental: boolean;
  terrain: boolean;
  routes: boolean;
  infrastructure: boolean;
  points: boolean;
};

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  corridor: true,
  environmental: true,
  terrain: true,
  routes: true,
  infrastructure: true,
  points: true,
};

const LAYER_TOGGLE_OPTIONS: { key: keyof LayerVisibility; label: string }[] = [
  { key: "corridor", label: "Corridor" },
  { key: "terrain", label: "Terrain" },
  { key: "environmental", label: "Environment" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "routes", label: "Route" },
  { key: "points", label: "Pins" },
];

export function MapPanel({ data = null }: MapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapLike | null>(null);
  const overlayLayerRef = useRef<LeafletLayerGroupLike | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [layerVisibility, setLayerVisibility] =
    useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);

  useEffect(() => {
    loadLeafletAssets(() => setIsMapReady(true));
  }, []);

  useEffect(() => {
    if (!isMapReady || mapRef.current || !mapContainerRef.current || !window.L) return;

    const map = window.L.map(mapContainerRef.current, {
      zoomControl: true,
    });

    window.L
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      })
      .addTo(map);

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    mapRef.current = map;
    overlayLayerRef.current = window.L.layerGroup().addTo(map);
    requestAnimationFrame(() => {
      map.invalidateSize?.();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      overlayLayerRef.current = null;
    };
  }, [isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const overlayLayer = overlayLayerRef.current;
    const leaflet = window.L;
    if (!isMapReady || !map || !overlayLayer || !leaflet) return;

    map.invalidateSize?.();
    overlayLayer.clearLayers();

    if (!data) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const boundsPoints: [number, number][] = [];

    // 2. Corridor rectangle/polygon
    if (layerVisibility.corridor && data.polygon.length > 0) {
      const corridorLayer = leaflet.polygon(data.polygon, {
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        weight: 1.6,
      });

      const terrainMetaLines: string[] = [];
      if (data.corridorId) {
        terrainMetaLines.push(`<strong>Corridor</strong>: ${escapeHtml(data.corridorId)}`);
      }
      if (typeof data.terrainAnalysis?.totalExcavationEstimateM3 === "number") {
        terrainMetaLines.push(
          `<strong>Estimated Excavation</strong>: ${formatNumber(data.terrainAnalysis.totalExcavationEstimateM3)} m3`
        );
      }
      if (data.terrainAnalysis?.engineeringRecommendation) {
        terrainMetaLines.push(
          `<strong>Recommendation</strong>: ${escapeHtml(data.terrainAnalysis.engineeringRecommendation)}`
        );
      }
      if (terrainMetaLines.length > 0) {
        corridorLayer.bindPopup?.(terrainMetaLines.join("<br/>"));
      }

      overlayLayer.addLayer(corridorLayer);
      boundsPoints.push(...data.polygon);
    }

    // 3. Environmental constraints polygons
    if (layerVisibility.environmental) {
      for (const zone of data.noGoZones ?? []) {
        const style = getConstraintStyle(zone);
        const zoneLines = [
          zone.zoneId ? `<strong>Zone ID</strong>: ${escapeHtml(zone.zoneId)}` : null,
          `<strong>${escapeHtml(style.label)}</strong>: ${escapeHtml(zone.description)}`,
          zone.radiusKm !== undefined ? `<strong>Radius</strong>: ${zone.radiusKm} km` : null,
          zone.reason ? `<strong>Reason</strong>: ${escapeHtml(zone.reason)}` : null,
        ]
          .filter((line): line is string => line !== null)
          .join("<br/>");

        const zonePolygon =
          zone.polygon && zone.polygon.length > 2
            ? zone.polygon
            : zone.latitude !== undefined && zone.longitude !== undefined && zone.radiusKm !== undefined
              ? circlePolygon([zone.latitude, zone.longitude], zone.radiusKm)
              : null;

        if (zonePolygon && zonePolygon.length > 2) {
          const polygonLayer = leaflet.polygon(zonePolygon, {
            color: style.stroke,
            fillColor: style.fill,
            fillOpacity: style.opacity,
            weight: 1.4,
            dashArray: "4 6",
          });
          polygonLayer.bindPopup?.(zoneLines);
          overlayLayer.addLayer(polygonLayer);
          boundsPoints.push(...zonePolygon);
        }
      }
    }

    // 4. Terrain difficulty line segments
    if (layerVisibility.terrain) {
      for (const segment of data.terrainAnalysis?.segmentAnalysis ?? []) {
        if (!segment.startCoordinate || !segment.endCoordinate) continue;

        const start: [number, number] = [
          segment.startCoordinate.latitude,
          segment.startCoordinate.longitude,
        ];
        const end: [number, number] = [
          segment.endCoordinate.latitude,
          segment.endCoordinate.longitude,
        ];

        const color = getTerrainColor(segment.difficultyScore, segment.floodRisk);
        const segmentDetails = [
          segment.segmentId ? `<strong>ID</strong>: ${escapeHtml(segment.segmentId)}` : null,
          segment.label ? `<strong>Label</strong>: ${escapeHtml(segment.label)}` : null,
          segment.country ? `<strong>Country</strong>: ${escapeHtml(segment.country)}` : null,
          `<strong>Segment</strong>: ${segment.startKm}-${segment.endKm} km`,
          segment.difficultyScore !== undefined
            ? `<strong>Difficulty</strong>: ${segment.difficultyScore}/10`
            : null,
          segment.avgSlope !== undefined ? `<strong>Avg Slope</strong>: ${segment.avgSlope}%` : null,
          segment.soilStability
            ? `<strong>Soil Stability</strong>: ${escapeHtml(segment.soilStability)}`
            : null,
          segment.floodRisk ? `<strong>Flood Risk</strong>: ${escapeHtml(segment.floodRisk)}` : null,
        ]
          .filter((line): line is string => line !== null)
          .join("<br/>");

        const segmentLine = leaflet.polyline([start, end], {
          color,
          weight: 5,
          opacity: 0.9,
        });
        segmentLine.bindPopup?.(segmentDetails);
        overlayLayer.addLayer(segmentLine);
        boundsPoints.push(start, end);
      }
    }

    const routeVariants = layerVisibility.routes ? data.routeVariants ?? [] : [];
    const recommendedVariant = getRecommendedVariant(routeVariants);

    // 5. Ranked route variants (Orange V2, Green V3, Red thin dashed V4/V5 — recommended V1 drawn in step 7)
    for (const variant of routeVariants) {
      if (variant.route.length < 2) continue;
      const rank = variant.rank ?? 99;
      const isRecommended = recommendedVariant?.variantId
        ? variant.variantId === recommendedVariant.variantId
        : recommendedVariant === variant;

      if (isRecommended) continue;

      const style = getRouteVariantStyle(rank);
      const routeLine = leaflet.polyline(variant.route, {
        color: style.color,
        weight: style.weight,
        opacity: 0.88,
        dashArray: style.dashArray,
      });

      const routePopupLines = [
        `<strong>${escapeHtml(variant.label)}</strong>`,
        variant.rank !== undefined ? `<strong>Rank</strong>: ${variant.rank}` : null,
        variant.distanceKm !== undefined
          ? `<strong>Distance</strong>: ${formatNumber(variant.distanceKm)} km`
          : null,
        variant.estimatedDurationHours !== undefined
          ? `<strong>Duration</strong>: ${variant.estimatedDurationHours} hrs`
          : null,
        variant.estimatedCostUsd !== undefined
          ? `<strong>Net CAPEX</strong>: $${formatNumber(variant.estimatedCostUsd)}`
          : null,
      ]
        .filter((line): line is string => line !== null)
        .join("<br/>");

      routeLine.bindPopup?.(routePopupLines);
      overlayLayer.addLayer(routeLine);
      boundsPoints.push(...variant.route);
    }

    // 6. Infrastructure markers: typed by color/shape (yellow=power, orange=industrial, blue=port, brown=mining, purple square=substation/data center); confidence ring = solid fill (auto-verified), dashed border (manual review)
    if (layerVisibility.infrastructure) {
      for (const detection of data.infrastructureDetections ?? []) {
        const latLng: [number, number] = [detection.latitude, detection.longitude];
        boundsPoints.push(latLng);

        const style = getInfrastructureStyle(detection.type);
        const status = (detection.verificationStatus ?? "").toLowerCase();
        const isManualReview = status.includes("manual"); // dashed border = manual_review_required; solid = auto_verified
        const popupLines = [
          `<strong>${escapeHtml(detection.label)}</strong>`,
          `<strong>Type</strong>: ${escapeHtml(style.typeLabel)}`,
          detection.subtype ? `<strong>Subtype</strong>: ${escapeHtml(detection.subtype)}` : null,
          detection.detectionId ? `<strong>ID</strong>: ${escapeHtml(detection.detectionId)}` : null,
          detection.confidence !== undefined
            ? `<strong>Confidence</strong>: ${Math.round(detection.confidence * 100)}%`
            : null,
          detection.verificationStatus
            ? `<strong>Verification</strong>: ${escapeHtml(detection.verificationStatus.replaceAll("_", " "))}`
            : null,
          detection.gridInterconnectionPriority
            ? `<strong>Grid Priority</strong>: ${escapeHtml(detection.gridInterconnectionPriority)}`
            : null,
          detection.estimatedPowerDemandMw !== undefined
            ? `<strong>Estimated Demand</strong>: ${formatNumber(detection.estimatedPowerDemandMw)} MW`
            : null,
          detection.estimatedGenerationCapacityMw !== undefined
            ? `<strong>Generation Capacity</strong>: ${formatNumber(detection.estimatedGenerationCapacityMw)} MW`
            : null,
        ]
          .filter((line): line is string => line !== null)
          .join("<br/>");

        if (style.isSquare) {
          const markerLayer = leaflet.polygon(squareAroundPoint(latLng, 0.25), {
            color: "#ffffff",
            weight: 2,
            fillColor: style.color,
            fillOpacity: isManualReview ? 0.55 : 0.95,
            dashArray: isManualReview ? "4 4" : undefined, // confidence ring: dashed = manual review
          });
          markerLayer.bindPopup?.(popupLines);
          overlayLayer.addLayer(markerLayer);
        } else {
          const marker = leaflet.circleMarker(latLng, {
            radius: 6,
            color: "#ffffff",
            weight: 2,
            fillColor: style.color,
            fillOpacity: isManualReview ? 0.55 : 0.95,
            dashArray: isManualReview ? "4 4" : undefined, // confidence ring: solid = auto-verified, dashed = manual review
          });
          marker.bindPopup(popupLines);
          overlayLayer.addLayer(marker);
        }

        if (detection.bbox) {
          const bboxPolygon: [number, number][] = [
            [detection.bbox.topLeft.latitude, detection.bbox.topLeft.longitude],
            [detection.bbox.topLeft.latitude, detection.bbox.bottomRight.longitude],
            [detection.bbox.bottomRight.latitude, detection.bbox.bottomRight.longitude],
            [detection.bbox.bottomRight.latitude, detection.bbox.topLeft.longitude],
          ];
          const bboxLayer = leaflet.polygon(bboxPolygon, {
            color: style.color,
            fillColor: style.color,
            fillOpacity: 0.1,
            weight: 1,
          });
          bboxLayer.bindPopup?.(popupLines);
          overlayLayer.addLayer(bboxLayer);
          boundsPoints.push(...bboxPolygon);
        }
      }
    }

    // 7. Recommended route on top: Blue (thick, solid) → ROUTE-V1 Recommended
    if (recommendedVariant && recommendedVariant.route.length >= 2) {
      const style = getRouteVariantStyle(recommendedVariant.rank ?? 1);
      const halo = leaflet.polyline(recommendedVariant.route, {
        color: "#93c5fd",
        weight: 10,
        opacity: 0.5,
      });
      overlayLayer.addLayer(halo);

      const recommendedLine = leaflet.polyline(recommendedVariant.route, {
        color: style.color,
        weight: style.weight,
        opacity: 0.95,
        dashArray: style.dashArray,
      });
      const routePopupLines = [
        `<strong>${escapeHtml(recommendedVariant.label)}</strong>`,
        `<strong>Recommended Route</strong> (${style.label})`,
        recommendedVariant.rank !== undefined
          ? `<strong>Rank</strong>: ${recommendedVariant.rank}`
          : null,
        recommendedVariant.distanceKm !== undefined
          ? `<strong>Distance</strong>: ${formatNumber(recommendedVariant.distanceKm)} km`
          : null,
        recommendedVariant.estimatedCostUsd !== undefined
          ? `<strong>Net CAPEX</strong>: $${formatNumber(recommendedVariant.estimatedCostUsd)}`
          : null,
      ]
        .filter((line): line is string => line !== null)
        .join("<br/>");
      recommendedLine.bindPopup?.(routePopupLines);
      overlayLayer.addLayer(recommendedLine);
      boundsPoints.push(...recommendedVariant.route);
    }

    // 8. Start / end pins
    if (layerVisibility.points) {
      for (const point of data.points) {
        const latLng: [number, number] = [point.latitude, point.longitude];
        boundsPoints.push(latLng);
        const safeLabel = escapeHtml(point.label);
        const marker = leaflet.marker(latLng).bindPopup(
          `<strong>${safeLabel}</strong>${
            point.confidence ? `<br/>Confidence: ${Math.round(point.confidence * 100)}%` : ""
          }`
        );
        overlayLayer.addLayer(marker);
      }
    }

    if (boundsPoints.length > 0) {
      const bounds = leaflet.latLngBounds(boundsPoints);
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2), { animate: true });
        return;
      }
    }
  }, [data, isMapReady, layerVisibility]);

  useEffect(() => {
    if (!isMapReady) return;

    const handleResize = () => {
      mapRef.current?.invalidateSize?.();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMapReady]);

  return (
    <div className="h-full w-full bg-muted/20">
      <div className="relative h-full w-full overflow-hidden border border-border bg-background shadow-sm">
        <div ref={mapContainerRef} className="h-full w-full" />
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 text-sm text-muted-foreground">
            Loading map...
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 px-2">
          <div className="pointer-events-auto inline-flex max-w-[calc(100vw-1rem)] flex-wrap items-center gap-1.5 rounded-2xl border border-white/60 bg-background/90 p-2 shadow-xl backdrop-blur-md">
            <span className="mr-1 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Layers
            </span>
            {LAYER_TOGGLE_OPTIONS.map((option) => {
              const isSelected = layerVisibility[option.key];
              return (
                <label
                  key={option.key}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                    isSelected
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/70 bg-background/80 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={(event) =>
                      setLayerVisibility((previous) => ({
                        ...previous,
                        [option.key]: event.target.checked,
                      }))
                    }
                  />
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-primary" : "bg-muted-foreground/60"
                    }`}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
