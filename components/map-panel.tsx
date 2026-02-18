"use client";

import { useEffect, useRef, useState } from "react";

import { GeoJsonLayer, IconLayer, PathLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon } from "geojson";

import type { MapOverlayData, NoGoZone, RouteVariant } from "@/lib/map-overlay";

type LayerVisibility = {
  corridor: boolean;
  environmental: boolean;
  terrain: boolean;
  routes: boolean;
  infrastructure: boolean;
  points: boolean;
};

type OverlayObject = {
  popupHtml?: string;
  properties?: {
    popupHtml?: string;
  };
};

const DEFAULT_CENTER: [number, number] = [6.0, -0.3];
const DEFAULT_ZOOM = 5;
const MAPLIBRE_CSS_ID = "maplibre-css";

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

const PIN_ICON_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.8" flood-opacity="0.28"/>
      </filter>
    </defs>
    <path filter="url(#s)" d="M17 1C9.3 1 3 7.3 3 15c0 10.2 11.2 22.4 13 25.2.4.6 1.2.6 1.6 0C19.8 37.4 31 25.2 31 15 31 7.3 24.7 1 17 1z" fill="#2563eb" stroke="#ffffff" stroke-width="1.6"/>
    <circle cx="17" cy="15" r="5.2" fill="#ffffff"/>
  </svg>`
)}`;

const PIN_ICON = {
  url: PIN_ICON_URL,
  width: 34,
  height: 42,
  anchorY: 42,
};

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
  isSquare: boolean;
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
    return { color: "#facc15", isSquare: false, typeLabel: "Power / Generation" };
  }

  if (
    normalized.includes("industrial") ||
    normalized.includes("special_economic_zone") ||
    normalized.includes("sez") ||
    normalized.includes("oil_refinery") ||
    normalized.includes("refinery")
  ) {
    return { color: "#f97316", isSquare: false, typeLabel: "Industrial / SEZ" };
  }

  if (normalized.includes("port")) {
    return { color: "#3b82f6", isSquare: false, typeLabel: "Port Facility" };
  }

  if (normalized.includes("mining") || normalized.includes("mine")) {
    return { color: "#92400e", isSquare: false, typeLabel: "Mining" };
  }

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

export function MapPanel({ data = null }: MapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);

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

    if (layerVisibility.infrastructure) {
      const circles: Array<{
        position: [number, number];
        fillColor: [number, number, number, number];
        popupHtml: string;
      }> = [];
      const squares: Array<{
        polygon: [number, number][];
        fillColor: [number, number, number, number];
        popupHtml: string;
      }> = [];
      const bboxes: Array<{
        polygon: [number, number][];
        fillColor: [number, number, number, number];
        lineColor: [number, number, number, number];
        popupHtml: string;
      }> = [];

      for (const detection of data.infrastructureDetections ?? []) {
        const point: [number, number] = [detection.latitude, detection.longitude];
        boundsPoints.push(point);

        const style = getInfrastructureStyle(detection.type);
        const status = (detection.verificationStatus ?? "").toLowerCase();
        const isManual = status.includes("manual");
        const fillColor = hexToRgba(style.color, isManual ? 150 : 235);

        const popupHtml = [
          `<strong>${escapeHtml(detection.label)}</strong>`,
          `<strong>Type</strong>: ${escapeHtml(style.typeLabel)}`,
          detection.verificationStatus
            ? `<strong>Verification</strong>: ${escapeHtml(detection.verificationStatus.replaceAll("_", " "))}`
            : null,
        ]
          .filter((line): line is string => line !== null)
          .join("<br/>");

        if (style.isSquare) {
          squares.push({
            polygon: squareAroundPoint(point, 0.25).map(([lat, lng]) => [lng, lat]),
            fillColor,
            popupHtml,
          });
        } else {
          circles.push({
            position: [point[1], point[0]],
            fillColor,
            popupHtml,
          });
        }

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
            popupHtml,
          });
        }
      }

      if (circles.length > 0) {
        layers.push(
          new ScatterplotLayer({
            id: "infra-circles",
            data: circles,
            pickable: true,
            getPosition: (d: { position: [number, number] }) => d.position,
            getRadius: 7000,
            radiusUnits: "meters",
            getFillColor: (d: { fillColor: [number, number, number, number] }) => d.fillColor,
            getLineColor: [255, 255, 255, 255],
            lineWidthMinPixels: 2,
            stroked: true,
          })
        );
      }

      if (squares.length > 0) {
        layers.push(
          new PolygonLayer({
            id: "infra-squares",
            data: squares,
            pickable: true,
            getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
            getFillColor: (d: { fillColor: [number, number, number, number] }) => d.fillColor,
            getLineColor: [255, 255, 255, 255],
            lineWidthMinPixels: 2,
            stroked: true,
            filled: true,
          })
        );
      }

      if (bboxes.length > 0) {
        layers.push(
          new PolygonLayer({
            id: "infra-bboxes",
            data: bboxes,
            pickable: true,
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

    if (layerVisibility.points && data.points.length > 0) {
      const pointData = data.points.map((point) => {
        boundsPoints.push([point.latitude, point.longitude]);
        return {
          position: [point.longitude, point.latitude] as [number, number],
          popupHtml: `<strong>${escapeHtml(point.label)}</strong>${
            point.confidence ? `<br/>Confidence: ${Math.round(point.confidence * 100)}%` : ""
          }`,
        };
      });

      layers.push(
        new IconLayer({
          id: "map-pins",
          data: pointData,
          pickable: true,
          getPosition: (d: { position: [number, number] }) => d.position,
          getIcon: () => PIN_ICON,
          getSize: 34,
          sizeUnits: "pixels",
        })
      );
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
  }, [data, isMapReady, layerVisibility]);

  return (
    <div className="h-full w-full bg-muted/20">
      <div className="relative h-full w-full overflow-hidden border border-border bg-background shadow-sm">
        <div ref={mapContainerRef} className="h-full w-full" />
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 text-sm text-muted-foreground">
            Loading map...
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-[500] px-2">
          <div className="pointer-events-auto mx-auto flex w-fit max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-2xl border border-white/60 bg-background/90 p-2 shadow-xl backdrop-blur-md">
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
