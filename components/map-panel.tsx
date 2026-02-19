"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { GeoJsonLayer, IconLayer, PathLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Maximize2, Minimize2 } from "lucide-react";
import maplibregl, { Map as MapLibreMap, Popup as MapLibrePopup } from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon } from "geojson";

import type {
  MapOverlayData,
  NoGoZone,
  RouteVariant,
} from "@/lib/map-overlay";

type LayerVisibility = {
  corridor: boolean;
  environmental: boolean;
  terrain: boolean;
  routes: boolean;
  infrastructure: boolean;
  economicGaps: boolean;
  opportunities: boolean;
};

type OverlayObject = {
  popupHtml?: string;
  properties?: {
    popupHtml?: string;
  };
};

type SectorKey = "Energy" | "Mining" | "Agriculture" | "Industrial/Ports" | "Digital";
type InfrastructurePointDatum = {
  position: [number, number];
  popupHtml: string;
  icon: { url: string; width: number; height: number; anchorY: number };
  size: number;
};
type InfrastructureCategoryFilter = {
  value: "all" | "anchor_load" | "generation";
};
type GapFilter = {
  type: "all" | "Transmission Gap" | "Suppressed Demand Gap" | "Catalytic Gap";
  severity: "all" | "Critical" | "High" | "Medium";
  phase: "all" | "Phase 1" | "Phase 2" | "Phase 3";
  crossBorderOnly: boolean;
};
type OpportunityFilter = {
  phase: "all" | "Phase 1" | "Phase 2" | "Phase 3";
  topN: 5 | 10 | 15 | 24;
};

const DEFAULT_CENTER: [number, number] = [6.0, -0.3];
const DEFAULT_ZOOM = 5;
const MAPLIBRE_CSS_ID = "maplibre-css";
const FILTER_PANEL_POSITION_STORAGE_KEY = "corridor:map:filter-panel-position";
const FILTER_PANEL_MINIMIZED_STORAGE_KEY = "corridor:map:filter-panel-minimized";
const LAYER_PANEL_POSITION_STORAGE_KEY = "corridor:map:layer-panel-position";
const LAYER_PANEL_MINIMIZED_STORAGE_KEY = "corridor:map:layer-panel-minimized";
const LAYER_VISIBILITY_STORAGE_KEY = "corridor:map:layer-visibility";

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  corridor: true,
  environmental: true,
  terrain: true,
  routes: true,
  infrastructure: true,
  economicGaps: true,
  opportunities: true,
};

const LAYER_TOGGLE_OPTIONS: { key: keyof LayerVisibility; label: string }[] = [
  { key: "corridor", label: "Corridor" },
  { key: "terrain", label: "Terrain" },
  { key: "environmental", label: "Environment" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "routes", label: "Route" },
  { key: "economicGaps", label: "Economic Gaps" },
  { key: "opportunities", label: "Opportunities" },
];

const FILTER_PANEL_PADDING = 12;

function createPinIconUrl(hexColor: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
      <defs>
        <filter id="s" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.8" flood-opacity="0.28"/>
        </filter>
      </defs>
      <path filter="url(#s)" d="M17 1C9.3 1 3 7.3 3 15c0 10.2 11.2 22.4 13 25.2.4.6 1.2.6 1.6 0C19.8 37.4 31 25.2 31 15 31 7.3 24.7 1 17 1z" fill="${hexColor}" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="17" cy="15" r="5.2" fill="#ffffff"/>
    </svg>`
  )}`;
}

const PIN_ICON_SHAPE = {
  width: 34,
  height: 42,
  anchorY: 42,
};

function formatMw(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function readStoredPanelPosition(storageKey: string): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const x = Number((parsed as { x?: unknown }).x);
    const y = Number((parsed as { y?: unknown }).y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch {
    return null;
  }
}

function readStoredBoolean(storageKey: string, fallback = false): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "boolean" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readStoredLayerVisibility(): LayerVisibility {
  if (typeof window === "undefined") return DEFAULT_LAYER_VISIBILITY;
  const raw = window.localStorage.getItem(LAYER_VISIBILITY_STORAGE_KEY);
  if (!raw) return DEFAULT_LAYER_VISIBILITY;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return DEFAULT_LAYER_VISIBILITY;

    const record = parsed as Record<string, unknown>;
    const normalized: LayerVisibility = { ...DEFAULT_LAYER_VISIBILITY };

    for (const key of Object.keys(DEFAULT_LAYER_VISIBILITY) as Array<keyof LayerVisibility>) {
      const value = record[key];
      if (typeof value === "boolean") {
        normalized[key] = value;
      }
    }

    return normalized;
  } catch {
    return DEFAULT_LAYER_VISIBILITY;
  }
}

function isGenerationText(value: string | undefined): boolean {
  const normalized = (value ?? "").toLowerCase();
  return (
    normalized.includes("generation") ||
    normalized.includes("power plant") ||
    normalized.includes("thermal") ||
    normalized.includes("hydro") ||
    normalized.includes("solar") ||
    normalized.includes("pv") ||
    normalized.includes("ccgt") ||
    normalized.includes("ocgt") ||
    normalized.includes("dam")
  );
}

function ensureMapLibreCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById(MAPLIBRE_CSS_ID)) return;

  const cssLink = document.createElement("link");
  cssLink.id = MAPLIBRE_CSS_ID;
  cssLink.rel = "stylesheet";
  cssLink.href = "https://unpkg.com/maplibre-gl@5.18.0/dist/maplibre-gl.css";
  document.head.appendChild(cssLink);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hexToRgba(hexColor: string, alpha: number): [number, number, number, number] {
  const hex = hexColor.replace("#", "");
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    alpha,
  ];
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

function getInfrastructureStyle(type: string): {
  color: string;
  typeLabel: string;
} {
  const normalized = type.toLowerCase();

  if (
    normalized.includes("power_plant") ||
    normalized.includes("generation") ||
    normalized.includes("generation_asset") ||
    normalized.includes("hydroelectric") ||
    normalized.includes("solar_farm")
  ) {
    return { color: "#facc15", typeLabel: "Power / Generation" };
  }

  if (
    normalized.includes("industrial") ||
    normalized.includes("special_economic_zone") ||
    normalized.includes("sez") ||
    normalized.includes("oil_refinery") ||
    normalized.includes("refinery")
  ) {
    return { color: "#f97316", typeLabel: "Industrial / SEZ" };
  }

  if (normalized.includes("port")) {
    return { color: "#3b82f6", typeLabel: "Port Facility" };
  }

  if (normalized.includes("mining") || normalized.includes("mine")) {
    return { color: "#92400e", typeLabel: "Mining" };
  }

  if (normalized.includes("data_center") || normalized.includes("substation")) {
    return { color: "#7e22ce", typeLabel: "Data Center / Substation" };
  }

  return { color: "#22c55e", typeLabel: "Infrastructure" };
}

function getConstraintStyle(zone: NoGoZone): {
  stroke: string;
  fill: string;
  opacity: number;
  label: string;
} {
  const normalized = `${zone.severity ?? ""} ${zone.reason ?? ""} ${zone.description}`.toLowerCase();

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

  if (normalized.includes("high") || normalized.includes("hard no-go")) {
    return {
      stroke: "#9a3412",
      fill: "#f97316",
      opacity: 0.25,
      label: "High risk",
    };
  }

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

function getRouteVariantStyle(rank: number): {
  color: string;
  width: number;
  label: string;
} {
  switch (rank) {
    case 1:
      return { color: "#2563eb", width: 6, label: "ROUTE-V1 Recommended" };
    case 2:
      return { color: "#f97316", width: 4, label: "ROUTE-V2 Inland detour" };
    case 3:
      return { color: "#16a34a", width: 4, label: "ROUTE-V3 Shortest path" };
    default:
      return { color: "#dc2626", width: 2, label: `ROUTE-V${rank} lower ranked` };
  }
}

function getGapTypeColor(gapType: string): [number, number, number, number] {
  const normalized = gapType.toLowerCase();
  if (normalized.includes("transmission")) return [37, 99, 235, 185];
  if (normalized.includes("suppressed")) return [234, 88, 12, 185];
  if (normalized.includes("catalytic")) return [22, 163, 74, 185];
  return [75, 85, 99, 185];
}

function getGapSeverityStrokeColor(severity: string): [number, number, number, number] {
  const normalized = severity.toLowerCase();
  if (normalized.includes("critical")) return [185, 28, 28, 245];
  if (normalized.includes("high")) return [194, 65, 12, 245];
  if (normalized.includes("medium")) return [161, 98, 7, 245];
  return [31, 41, 55, 245];
}

function getGapRadius(unmetDemandMw: number | undefined): number {
  const value = unmetDemandMw ?? 10;
  return Math.max(8, Math.min(34, Math.sqrt(value) + 7));
}

function getOpportunityFillColor(rank: number): [number, number, number, number] {
  if (rank <= 3) return [22, 163, 74, 190];
  if (rank <= 10) return [37, 99, 235, 180];
  if (rank <= 20) return [234, 88, 12, 175];
  return [107, 114, 128, 165];
}

function getOpportunityStrokeColor(phase: string | undefined): [number, number, number, number] {
  const normalized = (phase ?? "").toLowerCase();
  if (normalized.includes("phase 1")) return [22, 101, 52, 245];
  if (normalized.includes("phase 2")) return [30, 64, 175, 245];
  if (normalized.includes("phase 3")) return [127, 29, 29, 245];
  return [31, 41, 55, 235];
}

function getOpportunityRadius(score: number | undefined): number {
  const safe = Math.max(0, Math.min(100, score ?? 50));
  return 8 + (safe / 100) * 18;
}

function buildRouteTooltipHtml(variant: RouteVariant, isRecommended: boolean): string {
  const breakdown = variant.scoringBreakdown;
  return [
    `<strong>${escapeHtml(variant.label)}</strong>`,
    isRecommended ? "<strong>Recommended Route</strong>" : null,
    variant.rank !== undefined ? `<strong>Rank</strong>: ${variant.rank}` : null,
    variant.description ? `<strong>Description</strong>: ${escapeHtml(variant.description)}` : null,
    variant.compositeScore !== undefined
      ? `<strong>Composite Score</strong>: ${variant.compositeScore}`
      : null,
    variant.distanceKm !== undefined
      ? `<strong>Distance</strong>: ${formatNumber(variant.distanceKm)} km`
      : null,
    variant.estimatedCostUsd !== undefined
      ? `<strong>Net CAPEX</strong>: $${formatNumber(variant.estimatedCostUsd)}`
      : null,
    variant.grossCapexUsd !== undefined
      ? `<strong>Gross CAPEX</strong>: $${formatNumber(variant.grossCapexUsd)}`
      : null,
    variant.coLocationSavingUsd !== undefined
      ? `<strong>Co-location Savings</strong>: $${formatNumber(variant.coLocationSavingUsd)}`
      : null,
    variant.coLocationSavingPct !== undefined
      ? `<strong>Co-location Savings %</strong>: ${variant.coLocationSavingPct}%`
      : null,
    variant.weightedAvgHighwayOverlapPct !== undefined
      ? `<strong>Highway Overlap</strong>: ${variant.weightedAvgHighwayOverlapPct}%`
      : null,
    variant.straightLineOverheadPct !== undefined
      ? `<strong>Straight-line Overhead</strong>: ${variant.straightLineOverheadPct}%`
      : null,
    variant.anchorLoadsWithin15Km !== undefined
      ? `<strong>Anchor Loads (within 15km)</strong>: ${variant.anchorLoadsWithin15Km}`
      : null,
    variant.anchorLoadsDirectlyServed !== undefined
      ? `<strong>Anchor Loads (direct)</strong>: ${variant.anchorLoadsDirectlyServed}`
      : null,
    breakdown?.capexScore !== undefined ? `<strong>CAPEX Score</strong>: ${breakdown.capexScore}` : null,
    breakdown?.terrainScore !== undefined ? `<strong>Terrain Score</strong>: ${breakdown.terrainScore}` : null,
    breakdown?.environmentalScore !== undefined
      ? `<strong>Environmental Score</strong>: ${breakdown.environmentalScore}`
      : null,
    breakdown?.coLocationScore !== undefined
      ? `<strong>Co-location Score</strong>: ${breakdown.coLocationScore}`
      : null,
    breakdown?.anchorLoadCoverage !== undefined
      ? `<strong>Anchor Coverage Score</strong>: ${breakdown.anchorLoadCoverage}`
      : null,
    variant.equityIrrPct !== undefined ? `<strong>Equity IRR</strong>: ${variant.equityIrrPct}%` : null,
    variant.projectIrrPct !== undefined ? `<strong>Project IRR</strong>: ${variant.projectIrrPct}%` : null,
    variant.paybackYears !== undefined ? `<strong>Payback</strong>: ${variant.paybackYears} years` : null,
    variant.throughputGwh !== undefined
      ? `<strong>Year-5 Throughput</strong>: ${formatNumber(variant.throughputGwh)} GWh`
      : null,
    variant.revenueUsd !== undefined
      ? `<strong>Year-5 Revenue</strong>: $${formatNumber(variant.revenueUsd)}`
      : null,
    variant.ebitdaUsd !== undefined
      ? `<strong>Year-5 EBITDA</strong>: $${formatNumber(variant.ebitdaUsd)}`
      : null,
    variant.keyTradeoff ? `<strong>Tradeoff</strong>: ${escapeHtml(variant.keyTradeoff)}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("<br/>");
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

type MapPanelProps = {
  data?: MapOverlayData | null;
};

export function MapPanel({ data = null }: MapPanelProps) {
  const panelFrameRef = useRef<HTMLDivElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const layerTogglePanelRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const popupRef = useRef<MapLibrePopup | null>(null);
  const filterPanelDragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const layerToggleDragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [filterPanelPosition, setFilterPanelPosition] = useState<{ x: number; y: number } | null>(() =>
    readStoredPanelPosition(FILTER_PANEL_POSITION_STORAGE_KEY)
  );
  const [isFilterPanelMinimized, setIsFilterPanelMinimized] = useState(() =>
    readStoredBoolean(FILTER_PANEL_MINIMIZED_STORAGE_KEY, false)
  );
  const [layerTogglePanelPosition, setLayerTogglePanelPosition] = useState<{
    x: number;
    y: number;
  } | null>(() => readStoredPanelPosition(LAYER_PANEL_POSITION_STORAGE_KEY));
  const [isLayerToggleMinimized, setIsLayerToggleMinimized] = useState(() =>
    readStoredBoolean(LAYER_PANEL_MINIMIZED_STORAGE_KEY, false)
  );
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(() =>
    readStoredLayerVisibility()
  );
  const [infrastructureFilter, setInfrastructureFilter] = useState<InfrastructureCategoryFilter>({
    value: "all",
  });
  const [gapFilter, setGapFilter] = useState<GapFilter>({
    type: "all",
    severity: "all",
    phase: "all",
    crossBorderOnly: false,
  });
  const [opportunityFilter, setOpportunityFilter] = useState<OpportunityFilter>({
    phase: "all",
    topN: 10,
  });
  const filteredInfrastructureDetections = useMemo(() => {
    const detections = data?.infrastructureDetections ?? [];
    if (infrastructureFilter.value === "all") return detections;
    return detections.filter(
      (detection) =>
        (infrastructureFilter.value === "anchor_load" &&
          (detection.isAnchorLoad === true ||
            (detection.isGenerationAsset !== true && !isGenerationText(detection.type)))) ||
        (infrastructureFilter.value === "generation" &&
          (detection.isGenerationAsset === true || isGenerationText(detection.type)))
    );
  }, [data?.infrastructureDetections, infrastructureFilter]);
  const filteredEconomicGaps = useMemo(() => {
    const gaps = data?.economicGaps ?? [];
    return gaps.filter((gap) => {
      const matchesType = gapFilter.type === "all" || gap.gapType === gapFilter.type;
      const matchesSeverity = gapFilter.severity === "all" || gap.severity === gapFilter.severity;
      const matchesPhase = gapFilter.phase === "all" || gap.investmentPriority === gapFilter.phase;
      const matchesBorder = !gapFilter.crossBorderOnly || gap.countrySpan.length > 1;
      return matchesType && matchesSeverity && matchesPhase && matchesBorder;
    });
  }, [data?.economicGaps, gapFilter]);
  const opportunityCoordinatesByAnchorId = useMemo(() => {
    const coordinates = new Map<string, { latitude: number; longitude: number }>();
    for (const point of data?.points ?? []) {
      if (!point.anchorId) continue;
      coordinates.set(point.anchorId, {
        latitude: point.latitude,
        longitude: point.longitude,
      });
    }
    return coordinates;
  }, [data?.points]);
  const filteredOpportunities = useMemo(() => {
    const opportunities = data?.prioritizedOpportunities ?? [];
    return opportunities.filter((opportunity) => {
      const withinTopN = opportunity.rank <= opportunityFilter.topN;
      const matchesPhase =
        opportunityFilter.phase === "all" || opportunity.phase === opportunityFilter.phase;
      return withinTopN && matchesPhase;
    });
  }, [data?.prioritizedOpportunities, opportunityFilter]);
  useEffect(() => {
    popupRef.current?.remove();
    popupRef.current = null;
  }, [data]);

  useEffect(() => {
    ensureMapLibreCss();
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
      zoom: DEFAULT_ZOOM,
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
    });

    const onLoad = () => {
      const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
      map.addControl(overlay);
      overlayRef.current = overlay;
      mapRef.current = map;
      setIsMapReady(true);
    };

    map.on("load", onLoad);

    return () => {
      map.off("load", onLoad);
      overlayRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;

    if (!isMapReady || !map || !overlay) return;

    if (!data) {
      overlay.setProps({ layers: [] });
      map.jumpTo({ center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]], zoom: DEFAULT_ZOOM });
      return;
    }

    const boundsPoints: [number, number][] = [];
    const layers: unknown[] = [];

    if (layerVisibility.corridor && data.polygon.length > 2) {
      boundsPoints.push(...data.polygon);
      const corridorPopupLines: string[] = [];
      if (data.corridorId) {
        corridorPopupLines.push(`<strong>Corridor</strong>: ${escapeHtml(data.corridorId)}`);
      }
      if (typeof data.terrainAnalysis?.totalExcavationEstimateM3 === "number") {
        corridorPopupLines.push(
          `<strong>Estimated Excavation</strong>: ${formatNumber(data.terrainAnalysis.totalExcavationEstimateM3)} m3`
        );
      }
      if (data.terrainAnalysis?.engineeringRecommendation) {
        corridorPopupLines.push(
          `<strong>Recommendation</strong>: ${escapeHtml(data.terrainAnalysis.engineeringRecommendation)}`
        );
      }

      layers.push(
        new GeoJsonLayer({
          id: "corridor-polygon",
          data: {
            type: "Feature",
            properties: { popupHtml: corridorPopupLines.join("<br/>") },
            geometry: {
              type: "Polygon",
              coordinates: [data.polygon.map(([lat, lng]) => [lng, lat])],
            },
          } as Feature<Polygon, { popupHtml: string }>,
          pickable: true,
          stroked: true,
          filled: true,
          getLineColor: [37, 99, 235, 220],
          getFillColor: [59, 130, 246, 45],
          lineWidthMinPixels: 2,
        })
      );
    }

    if (layerVisibility.environmental) {
      const features = (data.noGoZones ?? [])
        .map((zone) => {
          const style = getConstraintStyle(zone);
          const polygon =
            zone.polygon && zone.polygon.length > 2
              ? zone.polygon
              : zone.latitude !== undefined && zone.longitude !== undefined && zone.radiusKm !== undefined
                ? circlePolygon([zone.latitude, zone.longitude], zone.radiusKm)
                : null;
          if (!polygon || polygon.length < 3) return null;

          boundsPoints.push(...polygon);
          const popupHtml = [
            zone.zoneId ? `<strong>Zone ID</strong>: ${escapeHtml(zone.zoneId)}` : null,
            `<strong>${escapeHtml(style.label)}</strong>: ${escapeHtml(zone.description)}`,
            zone.radiusKm !== undefined ? `<strong>Radius</strong>: ${zone.radiusKm} km` : null,
            zone.reason ? `<strong>Reason</strong>: ${escapeHtml(zone.reason)}` : null,
          ]
            .filter((line): line is string => line !== null)
            .join("<br/>");

          return {
            type: "Feature",
            properties: {
              popupHtml,
              fillColor: hexToRgba(style.fill, Math.round(style.opacity * 255)),
              strokeColor: hexToRgba(style.stroke, 230),
            },
            geometry: {
              type: "Polygon",
              coordinates: [polygon.map(([lat, lng]) => [lng, lat])],
            },
          };
        })
        .filter((feature) => feature !== null);

      if (features.length > 0) {
        layers.push(
          new GeoJsonLayer({
            id: "environmental-zones",
            data: { type: "FeatureCollection", features } as FeatureCollection,
            pickable: true,
            stroked: true,
            filled: true,
            getLineColor: (feature: { properties?: { strokeColor?: [number, number, number, number] } }) =>
              feature.properties?.strokeColor ?? [161, 98, 7, 230],
            getFillColor: (feature: { properties?: { fillColor?: [number, number, number, number] } }) =>
              feature.properties?.fillColor ?? [250, 204, 21, 50],
            lineWidthMinPixels: 1.5,
          })
        );
      }
    }

    if (layerVisibility.terrain) {
      const terrainData = (data.terrainAnalysis?.segmentAnalysis ?? [])
        .filter((segment) => segment.startCoordinate && segment.endCoordinate)
        .map((segment) => {
          const start: [number, number] = [
            segment.startCoordinate!.latitude,
            segment.startCoordinate!.longitude,
          ];
          const end: [number, number] = [segment.endCoordinate!.latitude, segment.endCoordinate!.longitude];
          boundsPoints.push(start, end);
          const color = getTerrainColor(segment.difficultyScore, segment.floodRisk);

          const popupHtml = [
            segment.segmentId ? `<strong>ID</strong>: ${escapeHtml(segment.segmentId)}` : null,
            segment.label ? `<strong>Label</strong>: ${escapeHtml(segment.label)}` : null,
            segment.country ? `<strong>Country</strong>: ${escapeHtml(segment.country)}` : null,
            `<strong>Segment</strong>: ${segment.startKm}-${segment.endKm} km`,
          ]
            .filter((line): line is string => line !== null)
            .join("<br/>");

          return {
            path: [
              [start[1], start[0]],
              [end[1], end[0]],
            ] as [number, number][],
            color: hexToRgba(color, 230),
            popupHtml,
          };
        });

      if (terrainData.length > 0) {
        layers.push(
          new PathLayer({
            id: "terrain-segments",
            data: terrainData,
            pickable: true,
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: (d: { color: [number, number, number, number] }) => d.color,
            getWidth: 5,
            widthUnits: "pixels",
          })
        );
      }
    }

    const routeVariants = layerVisibility.routes ? data.routeVariants ?? [] : [];
    const recommendedVariant = getRecommendedVariant(routeVariants);

    const routesData = routeVariants
      .filter((variant) => {
        if (!recommendedVariant) return true;
        return recommendedVariant.variantId
          ? variant.variantId !== recommendedVariant.variantId
          : variant !== recommendedVariant;
      })
      .filter((variant) => variant.route.length >= 2)
      .map((variant) => {
        boundsPoints.push(...variant.route);
        const style = getRouteVariantStyle(variant.rank ?? 99);
        return {
          path: variant.route.map(([lat, lng]) => [lng, lat] as [number, number]),
          color: hexToRgba(style.color, 225),
          width: style.width,
          popupHtml: buildRouteTooltipHtml(variant, false),
        };
      });

    if (routesData.length > 0) {
      layers.push(
        new PathLayer({
          id: "route-variants",
          data: routesData,
          pickable: true,
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: (d: { color: [number, number, number, number] }) => d.color,
          getWidth: (d: { width: number }) => d.width,
          widthUnits: "pixels",
        })
      );
    }

    if (recommendedVariant && recommendedVariant.route.length >= 2) {
      boundsPoints.push(...recommendedVariant.route);
      const style = getRouteVariantStyle(recommendedVariant.rank ?? 1);
      const path = recommendedVariant.route.map(([lat, lng]) => [lng, lat] as [number, number]);

      layers.push(
        new PathLayer({
          id: "route-recommended-halo",
          data: [{ path }],
          pickable: false,
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: [147, 197, 253, 140],
          getWidth: 10,
          widthUnits: "pixels",
        })
      );

      layers.push(
        new PathLayer({
          id: "route-recommended",
          data: [{ path, popupHtml: buildRouteTooltipHtml(recommendedVariant, true) }],
          pickable: true,
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: hexToRgba(style.color, 245),
          getWidth: style.width,
          widthUnits: "pixels",
        })
      );
    }

    if (layerVisibility.economicGaps && filteredEconomicGaps.length > 0) {
      const gapData = filteredEconomicGaps.map((gap) => {
        const gapTypeColor = getGapTypeColor(gap.gapType);
        const severityStrokeColor = getGapSeverityStrokeColor(gap.severity);
        boundsPoints.push([gap.latitude, gap.longitude]);

        const popupHtml = [
          `<strong>${escapeHtml(gap.name)}</strong>`,
          `<strong>Gap ID</strong>: ${escapeHtml(gap.gapId)}`,
          `<strong>Type</strong>: ${escapeHtml(gap.gapType)}`,
          `<strong>Severity</strong>: ${escapeHtml(gap.severity)}`,
          `<strong>Phase</strong>: ${escapeHtml(gap.investmentPriority)}`,
          gap.countrySpan.length > 0
            ? `<strong>Countries</strong>: ${escapeHtml(gap.countrySpan.join(" / "))}`
            : null,
          gap.unmetDemandMw !== undefined ? `<strong>Unmet Demand</strong>: ${formatMw(gap.unmetDemandMw)} MW` : null,
          gap.addressableDemandMw !== undefined
            ? `<strong>Addressable Demand</strong>: ${formatMw(gap.addressableDemandMw)} MW`
            : null,
          gap.netCapexUsdM !== undefined
            ? `<strong>Net CAPEX</strong>: $${formatNumber(gap.netCapexUsdM)}M`
            : null,
          gap.primaryConstraint
            ? `<strong>Constraint</strong>: ${escapeHtml(gap.primaryConstraint)}`
            : null,
          gap.recommendedIntervention
            ? `<strong>Intervention</strong>: ${escapeHtml(gap.recommendedIntervention)}`
            : null,
          gap.isConditional ? "<strong>Conditional</strong>: Requires verification before execution" : null,
        ]
          .filter((line): line is string => line !== null)
          .join("<br/>");

        return {
          position: [gap.longitude, gap.latitude] as [number, number],
          fillColor: gapTypeColor,
          lineColor: severityStrokeColor,
          radius: getGapRadius(gap.unmetDemandMw),
          popupHtml,
        };
      });

      layers.push(
        new ScatterplotLayer({
          id: "economic-gap-points",
          data: gapData,
          pickable: true,
          stroked: true,
          filled: true,
          radiusUnits: "pixels",
          getPosition: (d: { position: [number, number] }) => d.position,
          getFillColor: (d: { fillColor: [number, number, number, number] }) => d.fillColor,
          getLineColor: (d: { lineColor: [number, number, number, number] }) => d.lineColor,
          getRadius: (d: { radius: number }) => d.radius,
          getLineWidth: 2,
        })
      );
    }

    if (layerVisibility.opportunities && filteredOpportunities.length > 0) {
      const opportunityData = filteredOpportunities
        .map((opportunity) => {
          const coords = opportunityCoordinatesByAnchorId.get(opportunity.anchorId);
          if (!coords) return null;
          boundsPoints.push([coords.latitude, coords.longitude]);

          const popupHtml = [
            `<strong>#${opportunity.rank} ${escapeHtml(opportunity.name)}</strong>`,
            `<strong>Anchor ID</strong>: ${escapeHtml(opportunity.anchorId)}`,
            opportunity.phase ? `<strong>Phase</strong>: ${escapeHtml(opportunity.phase)}` : null,
            opportunity.country ? `<strong>Country</strong>: ${escapeHtml(opportunity.country)}` : null,
            opportunity.sector ? `<strong>Sector</strong>: ${escapeHtml(opportunity.sector)}` : null,
            opportunity.compositeScore !== undefined
              ? `<strong>Composite Score</strong>: ${opportunity.compositeScore.toFixed(1)}`
              : null,
            opportunity.currentMw !== undefined
              ? `<strong>Current Demand</strong>: ${formatMw(opportunity.currentMw)} MW`
              : null,
            opportunity.year5Mw !== undefined
              ? `<strong>Year 5</strong>: ${formatMw(opportunity.year5Mw)} MW`
              : null,
            opportunity.year10Mw !== undefined
              ? `<strong>Year 10</strong>: ${formatMw(opportunity.year10Mw)} MW`
              : null,
            opportunity.bankabilityTier
              ? `<strong>Bankability Tier</strong>: ${escapeHtml(opportunity.bankabilityTier)}`
              : null,
            opportunity.estimatedAnnualRevenueUsdM !== undefined
              ? `<strong>Est. Annual Revenue</strong>: $${formatNumber(opportunity.estimatedAnnualRevenueUsdM)}M`
              : null,
            opportunity.gapsAddressed.length > 0
              ? `<strong>Gaps Addressed</strong>: ${escapeHtml(opportunity.gapsAddressed.join(", "))}`
              : null,
            opportunity.recommendedAction
              ? `<strong>Recommended Action</strong>: ${escapeHtml(opportunity.recommendedAction)}`
              : null,
          ]
            .filter((line): line is string => line !== null)
            .join("<br/>");

          return {
            position: [coords.longitude, coords.latitude] as [number, number],
            fillColor: getOpportunityFillColor(opportunity.rank),
            lineColor: getOpportunityStrokeColor(opportunity.phase),
            radius: getOpportunityRadius(opportunity.compositeScore),
            popupHtml,
          };
        })
        .filter((datum): datum is NonNullable<typeof datum> => datum !== null);

      if (opportunityData.length > 0) {
        layers.push(
          new ScatterplotLayer({
            id: "priority-opportunities",
            data: opportunityData,
            pickable: true,
            filled: true,
            stroked: true,
            radiusUnits: "pixels",
            getPosition: (d: { position: [number, number] }) => d.position,
            getFillColor: (d: { fillColor: [number, number, number, number] }) => d.fillColor,
            getLineColor: (d: { lineColor: [number, number, number, number] }) => d.lineColor,
            getRadius: (d: { radius: number }) => d.radius,
            getLineWidth: 2,
          })
        );
      }
    }

    if (layerVisibility.infrastructure) {
      const infrastructurePoints: InfrastructurePointDatum[] = [];
      const bboxes: Array<{
        polygon: [number, number][];
        fillColor: [number, number, number, number];
        lineColor: [number, number, number, number];
      }> = [];

      for (const detection of filteredInfrastructureDetections) {
        const point: [number, number] = [detection.latitude, detection.longitude];
        boundsPoints.push(point);

        const style = getInfrastructureStyle(detection.type);
        const status = (detection.verificationStatus ?? "").toLowerCase();
        const isManual = status.includes("manual");
        const fillColor = hexToRgba(style.color, isManual ? 150 : 235);

        const popupHtml = [
          `<strong>${escapeHtml(detection.label)}</strong>`,
          detection.detectionId
            ? `<strong>Detection ID</strong>: ${escapeHtml(detection.detectionId)}`
            : null,
          `<strong>Type</strong>: ${escapeHtml(style.typeLabel)}`,
          detection.subtype
            ? `<strong>Subtype</strong>: ${escapeHtml(detection.subtype)}`
            : null,
          detection.isAnchorLoad !== undefined
            ? `<strong>Anchor Load</strong>: ${detection.isAnchorLoad ? "Yes" : "No"}`
            : null,
          detection.isGenerationAsset !== undefined
            ? `<strong>Generation Asset</strong>: ${detection.isGenerationAsset ? "Yes" : "No"}`
            : null,
          detection.confidence !== undefined
            ? `<strong>Confidence</strong>: ${Math.round(detection.confidence * 100)}%`
            : null,
          detection.verificationStatus
            ? `<strong>Verification</strong>: ${escapeHtml(detection.verificationStatus.replaceAll("_", " "))}`
            : null,
        ]
          .filter((line): line is string => line !== null)
          .join("<br/>");

        infrastructurePoints.push({
          position: [point[1], point[0]],
          popupHtml,
          icon: { ...PIN_ICON_SHAPE, url: createPinIconUrl(style.color) },
          size: 34,
        });

        if (detection.bbox) {
          const bboxPolygon: [number, number][] = [
            [detection.bbox.topLeft.latitude, detection.bbox.topLeft.longitude],
            [detection.bbox.topLeft.latitude, detection.bbox.bottomRight.longitude],
            [detection.bbox.bottomRight.latitude, detection.bbox.bottomRight.longitude],
            [detection.bbox.bottomRight.latitude, detection.bbox.topLeft.longitude],
          ];
          boundsPoints.push(...bboxPolygon);
          bboxes.push({
            polygon: bboxPolygon.map(([lat, lng]) => [lng, lat]),
            fillColor: [fillColor[0], fillColor[1], fillColor[2], 30],
            lineColor: [fillColor[0], fillColor[1], fillColor[2], 190],
          });
        }
      }

      if (infrastructurePoints.length > 0) {
        layers.push(
          new IconLayer({
            id: "infra-pins",
            data: infrastructurePoints,
            pickable: true,
            getPosition: (d: InfrastructurePointDatum) => d.position,
            getIcon: (d: InfrastructurePointDatum) => d.icon,
            getSize: (d: InfrastructurePointDatum) => d.size,
            sizeUnits: "pixels",
          })
        );
      }

      if (bboxes.length > 0) {
        layers.push(
          new PolygonLayer({
            id: "infra-bboxes",
            data: bboxes,
            pickable: false,
            getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
            getFillColor: (d: { fillColor: [number, number, number, number] }) => d.fillColor,
            getLineColor: (d: { lineColor: [number, number, number, number] }) => d.lineColor,
            lineWidthMinPixels: 1,
            stroked: true,
            filled: true,
          })
        );
      }
    }

    overlay.setProps({
      layers: layers as never[],
      getTooltip: ({ object }: { object?: OverlayObject }) => {
        const popupHtml = object?.popupHtml ?? object?.properties?.popupHtml;
        if (!popupHtml) return null;
        return {
          html: popupHtml,
          style: {
            backgroundColor: "#ffffff",
            color: "#111827",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            padding: "8px 10px",
            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.12)",
            maxWidth: "280px",
          },
        };
      },
    });

    if (boundsPoints.length > 0) {
      let minLat = Number.POSITIVE_INFINITY;
      let maxLat = Number.NEGATIVE_INFINITY;
      let minLng = Number.POSITIVE_INFINITY;
      let maxLng = Number.NEGATIVE_INFINITY;

      for (const [lat, lng] of boundsPoints) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }

      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 48, duration: 900 }
      );
      return;
    }

    map.jumpTo({ center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]], zoom: DEFAULT_ZOOM });
  }, [
    data,
    filteredEconomicGaps,
    filteredOpportunities,
    filteredInfrastructureDetections,
    isMapReady,
    layerVisibility,
    opportunityCoordinatesByAnchorId,
  ]);

  const setInfrastructureFilterValue = (value: InfrastructureCategoryFilter["value"]) => {
    setInfrastructureFilter({ value });
  };

  useEffect(() => {
    const frame = panelFrameRef.current;
    const panel = filterPanelRef.current;
    if (!frame || !panel) return;

    const syncPosition = () => {
      const maxX = Math.max(
        FILTER_PANEL_PADDING,
        frame.clientWidth - panel.offsetWidth - FILTER_PANEL_PADDING
      );
      const maxY = Math.max(
        FILTER_PANEL_PADDING,
        frame.clientHeight - panel.offsetHeight - FILTER_PANEL_PADDING
      );

      setFilterPanelPosition((previous) => {
        if (!previous) {
          return { x: maxX, y: FILTER_PANEL_PADDING };
        }

        return {
          x: clampValue(previous.x, FILTER_PANEL_PADDING, maxX),
          y: clampValue(previous.y, FILTER_PANEL_PADDING, maxY),
        };
      });
    };

    syncPosition();
    window.addEventListener("resize", syncPosition);
    return () => window.removeEventListener("resize", syncPosition);
  }, [isFilterPanelMinimized]);

  const handleFilterDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const frame = panelFrameRef.current;
    const panel = filterPanelRef.current;
    if (!frame || !panel) return;

    event.preventDefault();
    const panelRect = panel.getBoundingClientRect();
    filterPanelDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleFilterDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = filterPanelDragRef.current;
    const frame = panelFrameRef.current;
    const panel = filterPanelRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !frame || !panel) return;

    const frameRect = frame.getBoundingClientRect();
    const maxX = Math.max(
      FILTER_PANEL_PADDING,
      frame.clientWidth - panel.offsetWidth - FILTER_PANEL_PADDING
    );
    const maxY = Math.max(
      FILTER_PANEL_PADDING,
      frame.clientHeight - panel.offsetHeight - FILTER_PANEL_PADDING
    );
    const nextX = event.clientX - frameRect.left - drag.offsetX;
    const nextY = event.clientY - frameRect.top - drag.offsetY;

    setFilterPanelPosition({
      x: clampValue(nextX, FILTER_PANEL_PADDING, maxX),
      y: clampValue(nextY, FILTER_PANEL_PADDING, maxY),
    });
  };

  const handleFilterDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (filterPanelDragRef.current?.pointerId !== event.pointerId) return;

    filterPanelDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const frame = panelFrameRef.current;
    const panel = layerTogglePanelRef.current;
    if (!frame || !panel) return;

    const syncPosition = () => {
      const maxX = Math.max(
        FILTER_PANEL_PADDING,
        frame.clientWidth - panel.offsetWidth - FILTER_PANEL_PADDING
      );
      const maxY = Math.max(
        FILTER_PANEL_PADDING,
        frame.clientHeight - panel.offsetHeight - FILTER_PANEL_PADDING
      );

      setLayerTogglePanelPosition((previous) => {
        const defaultX = clampValue(
          (frame.clientWidth - panel.offsetWidth) / 2,
          FILTER_PANEL_PADDING,
          maxX
        );
        const defaultY = maxY;

        if (!previous) {
          return { x: defaultX, y: defaultY };
        }

        return {
          x: clampValue(previous.x, FILTER_PANEL_PADDING, maxX),
          y: clampValue(previous.y, FILTER_PANEL_PADDING, maxY),
        };
      });
    };

    syncPosition();
    window.addEventListener("resize", syncPosition);
    return () => window.removeEventListener("resize", syncPosition);
  }, [isLayerToggleMinimized]);

  const handleLayerToggleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const frame = panelFrameRef.current;
    const panel = layerTogglePanelRef.current;
    if (!frame || !panel) return;

    event.preventDefault();
    const panelRect = panel.getBoundingClientRect();
    layerToggleDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLayerToggleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = layerToggleDragRef.current;
    const frame = panelFrameRef.current;
    const panel = layerTogglePanelRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !frame || !panel) return;

    const frameRect = frame.getBoundingClientRect();
    const maxX = Math.max(
      FILTER_PANEL_PADDING,
      frame.clientWidth - panel.offsetWidth - FILTER_PANEL_PADDING
    );
    const maxY = Math.max(
      FILTER_PANEL_PADDING,
      frame.clientHeight - panel.offsetHeight - FILTER_PANEL_PADDING
    );
    const nextX = event.clientX - frameRect.left - drag.offsetX;
    const nextY = event.clientY - frameRect.top - drag.offsetY;

    setLayerTogglePanelPosition({
      x: clampValue(nextX, FILTER_PANEL_PADDING, maxX),
      y: clampValue(nextY, FILTER_PANEL_PADDING, maxY),
    });
  };

  const handleLayerToggleDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (layerToggleDragRef.current?.pointerId !== event.pointerId) return;

    layerToggleDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !filterPanelPosition) return;
    window.localStorage.setItem(
      FILTER_PANEL_POSITION_STORAGE_KEY,
      JSON.stringify(filterPanelPosition)
    );
  }, [filterPanelPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      FILTER_PANEL_MINIMIZED_STORAGE_KEY,
      JSON.stringify(isFilterPanelMinimized)
    );
  }, [isFilterPanelMinimized]);

  useEffect(() => {
    if (typeof window === "undefined" || !layerTogglePanelPosition) return;
    window.localStorage.setItem(
      LAYER_PANEL_POSITION_STORAGE_KEY,
      JSON.stringify(layerTogglePanelPosition)
    );
  }, [layerTogglePanelPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LAYER_PANEL_MINIMIZED_STORAGE_KEY,
      JSON.stringify(isLayerToggleMinimized)
    );
  }, [isLayerToggleMinimized]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LAYER_VISIBILITY_STORAGE_KEY,
      JSON.stringify(layerVisibility)
    );
  }, [layerVisibility]);

  return (
    <div className="h-full w-full bg-muted/20">
      <div
        ref={panelFrameRef}
        className="relative h-full w-full overflow-hidden bg-background shadow-sm"
      >
        <div ref={mapContainerRef} className="h-full w-full" />
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 text-sm text-muted-foreground">
            Loading map...
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 z-[510]">
          <div
            ref={filterPanelRef}
            className="pointer-events-auto absolute min-w-[240px] rounded-xl border border-border bg-background/95 p-3 text-xs shadow-lg"
            style={{
              left: filterPanelPosition?.x ?? FILTER_PANEL_PADDING,
              top: filterPanelPosition?.y ?? FILTER_PANEL_PADDING,
            }}
          >
            <div
              className="-mx-3 -mt-3 mb-2 cursor-move select-none border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground touch-none"
              onPointerDown={handleFilterDragStart}
              onPointerMove={handleFilterDragMove}
              onPointerUp={handleFilterDragEnd}
              onPointerCancel={handleFilterDragEnd}
            >
              <div className="flex items-center justify-between gap-2">
                <span>Drag filters</span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-foreground hover:bg-transparent"
                  aria-expanded={!isFilterPanelMinimized}
                  aria-label={isFilterPanelMinimized ? "Expand filters" : "Minimize filters"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsFilterPanelMinimized((previous) => !previous);
                  }}
                >
                  {isFilterPanelMinimized ? (
                    <Maximize2 className="size-3" />
                  ) : (
                    <Minimize2 className="size-3" />
                  )}
                </button>
              </div>
            </div>
            {!isFilterPanelMinimized && (
              <>
                <p className="mb-2 text-sm font-semibold">Infrastructure Filter</p>
                <label className="flex items-center gap-2 py-1">
                  <input
                    type="radio"
                    name="infrastructure-filter"
                    checked={infrastructureFilter.value === "all"}
                    onChange={() => setInfrastructureFilterValue("all")}
                  />
                  <span>All</span>
                </label>
                <label className="flex items-center gap-2 py-1">
                  <input
                    type="radio"
                    name="infrastructure-filter"
                    checked={infrastructureFilter.value === "anchor_load"}
                    onChange={() => setInfrastructureFilterValue("anchor_load")}
                  />
                  <span>Anchor Load</span>
                </label>
                <label className="flex items-center gap-2 py-1">
                  <input
                    type="radio"
                    name="infrastructure-filter"
                    checked={infrastructureFilter.value === "generation"}
                    onChange={() => setInfrastructureFilterValue("generation")}
                  />
                  <span>Power Generation</span>
                </label>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-2 text-sm font-semibold">Economic Gap Filter</p>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[11px] text-muted-foreground">Type</span>
                    <select
                      className="w-full rounded border border-border bg-background px-2 py-1"
                      value={gapFilter.type}
                      onChange={(event) =>
                        setGapFilter((previous) => ({
                          ...previous,
                          type: event.target.value as GapFilter["type"],
                        }))
                      }
                    >
                      <option value="all">All types</option>
                      <option value="Transmission Gap">Transmission Gap</option>
                      <option value="Suppressed Demand Gap">Suppressed Demand Gap</option>
                      <option value="Catalytic Gap">Catalytic Gap</option>
                    </select>
                  </label>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[11px] text-muted-foreground">Severity</span>
                    <select
                      className="w-full rounded border border-border bg-background px-2 py-1"
                      value={gapFilter.severity}
                      onChange={(event) =>
                        setGapFilter((previous) => ({
                          ...previous,
                          severity: event.target.value as GapFilter["severity"],
                        }))
                      }
                    >
                      <option value="all">All severities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                    </select>
                  </label>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[11px] text-muted-foreground">Phase</span>
                    <select
                      className="w-full rounded border border-border bg-background px-2 py-1"
                      value={gapFilter.phase}
                      onChange={(event) =>
                        setGapFilter((previous) => ({
                          ...previous,
                          phase: event.target.value as GapFilter["phase"],
                        }))
                      }
                    >
                      <option value="all">All phases</option>
                      <option value="Phase 1">Phase 1</option>
                      <option value="Phase 2">Phase 2</option>
                      <option value="Phase 3">Phase 3</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={gapFilter.crossBorderOnly}
                      onChange={(event) =>
                        setGapFilter((previous) => ({
                          ...previous,
                          crossBorderOnly: event.target.checked,
                        }))
                      }
                    />
                    <span>Cross-border only</span>
                  </label>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Showing {filteredEconomicGaps.length} of {data?.economicGaps?.length ?? 0} gaps
                  </p>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-2 text-sm font-semibold">Opportunity Filter</p>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[11px] text-muted-foreground">Phase</span>
                    <select
                      className="w-full rounded border border-border bg-background px-2 py-1"
                      value={opportunityFilter.phase}
                      onChange={(event) =>
                        setOpportunityFilter((previous) => ({
                          ...previous,
                          phase: event.target.value as OpportunityFilter["phase"],
                        }))
                      }
                    >
                      <option value="all">All phases</option>
                      <option value="Phase 1">Phase 1</option>
                      <option value="Phase 2">Phase 2</option>
                      <option value="Phase 3">Phase 3</option>
                    </select>
                  </label>
                  <label className="mb-1 block">
                    <span className="mb-1 block text-[11px] text-muted-foreground">Top Ranked</span>
                    <select
                      className="w-full rounded border border-border bg-background px-2 py-1"
                      value={opportunityFilter.topN}
                      onChange={(event) =>
                        setOpportunityFilter((previous) => ({
                          ...previous,
                          topN: Number(event.target.value) as OpportunityFilter["topN"],
                        }))
                      }
                    >
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                      <option value={15}>Top 15</option>
                      <option value={24}>Top 24</option>
                    </select>
                  </label>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Showing {filteredOpportunities.length} of{" "}
                    {data?.prioritizedOpportunities?.length ?? 0} opportunities
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-[500]">
          <div
            ref={layerTogglePanelRef}
            className="pointer-events-auto absolute w-fit max-w-[calc(100%-1rem)] rounded-2xl border border-white/60 bg-background/90 p-2 shadow-xl backdrop-blur-md"
            style={{
              left: layerTogglePanelPosition?.x ?? FILTER_PANEL_PADDING,
              top: layerTogglePanelPosition?.y ?? FILTER_PANEL_PADDING,
            }}
          >
            <div
              className="-mx-2 -mt-2 mb-2 flex cursor-move select-none items-center justify-between rounded-t-2xl border-b border-border/60 bg-muted/35 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground touch-none"
              onPointerDown={handleLayerToggleDragStart}
              onPointerMove={handleLayerToggleDragMove}
              onPointerUp={handleLayerToggleDragEnd}
              onPointerCancel={handleLayerToggleDragEnd}
            >
              <span>Drag layers</span>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-foreground hover:bg-transparent"
                aria-expanded={!isLayerToggleMinimized}
                aria-label={isLayerToggleMinimized ? "Expand layers" : "Minimize layers"}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onPointerUp={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsLayerToggleMinimized((previous) => !previous);
                }}
              >
                {isLayerToggleMinimized ? (
                  <Maximize2 className="size-3" />
                ) : (
                  <Minimize2 className="size-3" />
                )}
              </button>
            </div>
            {!isLayerToggleMinimized && (
              <div className="flex flex-wrap items-center gap-1.5">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
