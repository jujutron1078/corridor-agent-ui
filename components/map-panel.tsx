"use client";

import { useEffect, useRef, useState } from "react";

import type { MapOverlayData } from "@/lib/map-overlay";

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

type TerrainBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

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

function getTerrainBounds(points: [number, number][]): TerrainBounds | null {
  if (points.length === 0) return null;

  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];

  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return { minLat, maxLat, minLng, maxLng };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getRiskWeight(floodRisk: string | undefined): number {
  const normalized = (floodRisk ?? "").toLowerCase();
  if (normalized.includes("critical")) return 3;
  if (normalized.includes("high")) return 2;
  if (normalized.includes("medium")) return 1;
  return 0;
}

function getHeatColor(floodRisk: string | undefined): string {
  const weight = getRiskWeight(floodRisk);
  if (weight >= 3) return "#b91c1c";
  if (weight === 2) return "#ea580c";
  if (weight === 1) return "#f59e0b";
  return "#16a34a";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function getInfrastructureColor(type: string, verificationStatus?: string): string {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("power_plant")) return "#2563eb";
  if (normalizedType.includes("substation")) return "#0ea5e9";
  if (normalizedType.includes("oil_refinery")) return "#f97316";
  if (normalizedType.includes("port_facility")) return "#14b8a6";
  if (normalizedType.includes("special_economic_zone")) return "#8b5cf6";
  if (normalizedType.includes("industrial_complex")) return "#eab308";
  if (verificationStatus?.toLowerCase().includes("manual_review")) return "#f59e0b";
  return "#22c55e";
}

function getSegmentBoxFromCoordinates(
  start: [number, number],
  end: [number, number]
): [number, number][] {
  const minLat = Math.min(start[0], end[0]);
  const maxLat = Math.max(start[0], end[0]);
  const minLng = Math.min(start[1], end[1]);
  const maxLng = Math.max(start[1], end[1]);

  const latPadding = Math.max((maxLat - minLat) * 0.08, 0.03);
  const lngPadding = Math.max((maxLng - minLng) * 0.08, 0.03);

  return [
    [minLat - latPadding, minLng - lngPadding],
    [maxLat + latPadding, minLng - lngPadding],
    [maxLat + latPadding, maxLng + lngPadding],
    [minLat - latPadding, maxLng + lngPadding],
  ];
}

type MapPanelProps = {
  data?: MapOverlayData | null;
};

export function MapPanel({ data = null }: MapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapLike | null>(null);
  const overlayLayerRef = useRef<LeafletLayerGroupLike | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

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

    for (const point of data.points) {
      const latLng: [number, number] = [point.latitude, point.longitude];
      boundsPoints.push(latLng);
      const safeLabel = escapeHtml(point.label);
      const marker = leaflet.marker(latLng).bindPopup(
        `<strong>${safeLabel}</strong>${point.confidence ? `<br/>Confidence: ${Math.round(point.confidence * 100)}%` : ""}`
      );
      overlayLayer.addLayer(marker);
    }

    for (const detection of data.infrastructureDetections ?? []) {
      const latLng: [number, number] = [detection.latitude, detection.longitude];
      boundsPoints.push(latLng);

      const color = getInfrastructureColor(detection.type, detection.verificationStatus);
      const popupLines = [
        `<strong>${escapeHtml(detection.label)}</strong>`,
        `<strong>Type</strong>: ${escapeHtml(detection.type.replaceAll("_", " "))}`,
        detection.subtype
          ? `<strong>Subtype</strong>: ${escapeHtml(detection.subtype)}`
          : null,
        detection.detectionId
          ? `<strong>ID</strong>: ${escapeHtml(detection.detectionId)}`
          : null,
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

      const marker = leaflet.circleMarker(latLng, {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      });
      marker.bindPopup(popupLines);
      overlayLayer.addLayer(marker);

      if (detection.bbox) {
        const bboxPolygon: [number, number][] = [
          [detection.bbox.topLeft.latitude, detection.bbox.topLeft.longitude],
          [detection.bbox.topLeft.latitude, detection.bbox.bottomRight.longitude],
          [detection.bbox.bottomRight.latitude, detection.bbox.bottomRight.longitude],
          [detection.bbox.bottomRight.latitude, detection.bbox.topLeft.longitude],
        ];
        const bboxLayer = leaflet.polygon(bboxPolygon, {
          color,
          fillColor: color,
          fillOpacity: 0.12,
          weight: 1.5,
        });
        bboxLayer.bindPopup?.(popupLines);
        overlayLayer.addLayer(bboxLayer);
        boundsPoints.push(...bboxPolygon);
      }
    }

    const terrainSegments = data.terrainAnalysis?.segmentAnalysis ?? [];
    let renderedTerrainFromCoordinates = false;

    for (const segment of terrainSegments) {
      if (!segment.startCoordinate || !segment.endCoordinate) continue;
      renderedTerrainFromCoordinates = true;

      const start: [number, number] = [
        segment.startCoordinate.latitude,
        segment.startCoordinate.longitude,
      ];
      const end: [number, number] = [
        segment.endCoordinate.latitude,
        segment.endCoordinate.longitude,
      ];
      const color = getHeatColor(segment.floodRisk);
      const segmentDetails = [
        segment.segmentId ? `<strong>ID</strong>: ${escapeHtml(segment.segmentId)}` : null,
        segment.label ? `<strong>Label</strong>: ${escapeHtml(segment.label)}` : null,
        segment.country ? `<strong>Country</strong>: ${escapeHtml(segment.country)}` : null,
        `<strong>Segment</strong>: ${segment.startKm}-${segment.endKm} km`,
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
        weight: 4,
        opacity: 0.9,
      });
      segmentLine.bindPopup?.(segmentDetails);
      overlayLayer.addLayer(segmentLine);

      const startDot = leaflet.circleMarker(start, {
        radius: 5,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      });
      startDot.bindPopup(`<strong>Segment Start</strong><br/>${segmentDetails}`);
      overlayLayer.addLayer(startDot);

      const endDot = leaflet.circleMarker(end, {
        radius: 5,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      });
      endDot.bindPopup(`<strong>Segment End</strong><br/>${segmentDetails}`);
      overlayLayer.addLayer(endDot);

      const boxLayer = leaflet.polygon(getSegmentBoxFromCoordinates(start, end), {
        color,
        fillColor: color,
        fillOpacity: 0.26,
        weight: 1,
      });
      boxLayer.bindPopup?.(segmentDetails);
      overlayLayer.addLayer(boxLayer);

      boundsPoints.push(start, end);
    }

    for (const zone of data.noGoZones ?? []) {
      const center: [number, number] = [zone.latitude, zone.longitude];
      boundsPoints.push(center);

      const riskCircle = leaflet.circleMarker(center, {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: "#7f1d1d",
        fillOpacity: 1,
      });

      const zoneLines = [
        zone.zoneId ? `<strong>Zone ID</strong>: ${escapeHtml(zone.zoneId)}` : null,
        `<strong>No-Go Zone</strong>: ${escapeHtml(zone.description)}`,
        zone.radiusKm !== undefined ? `<strong>Radius</strong>: ${zone.radiusKm} km` : null,
        zone.reason ? `<strong>Reason</strong>: ${escapeHtml(zone.reason)}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join("<br/>");
      riskCircle.bindPopup(zoneLines);
      overlayLayer.addLayer(riskCircle);

      if (zone.radiusKm !== undefined && zone.radiusKm > 0) {
        const ringPoints: [number, number][] = [];
        const latOffset = zone.radiusKm / 111;
        const lngOffset = zone.radiusKm / (111 * Math.max(Math.cos((zone.latitude * Math.PI) / 180), 0.1));
        for (let degree = 0; degree < 360; degree += 12) {
          const radians = (degree * Math.PI) / 180;
          ringPoints.push([
            zone.latitude + latOffset * Math.sin(radians),
            zone.longitude + lngOffset * Math.cos(radians),
          ]);
        }
        const ringLayer = leaflet.polygon(ringPoints, {
          color: "#7f1d1d",
          fillColor: "#ef4444",
          fillOpacity: 0.18,
          weight: 1,
        });
        ringLayer.bindPopup?.(zoneLines);
        overlayLayer.addLayer(ringLayer);
        boundsPoints.push(...ringPoints);
      }
    }

    if (data.polygon.length > 0) {
      const polygon = leaflet.polygon(data.polygon, {
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        weight: 2,
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
        polygon.bindPopup?.(terrainMetaLines.join("<br/>"));
      }

      overlayLayer.addLayer(polygon);
      boundsPoints.push(...data.polygon);

      if (terrainSegments.length > 0 && !renderedTerrainFromCoordinates) {
        const totalKm = terrainSegments.reduce(
          (max, segment) => Math.max(max, segment.endKm),
          0
        );
        const polygonBounds = getTerrainBounds(data.polygon);
        if (totalKm > 0 && polygonBounds) {
          const latSpan = polygonBounds.maxLat - polygonBounds.minLat;
          const lngSpan = polygonBounds.maxLng - polygonBounds.minLng;
          const isLngDominant = lngSpan >= latSpan;

          for (const segment of terrainSegments) {
            const startRatio = clamp(segment.startKm / totalKm, 0, 1);
            const endRatio = clamp(segment.endKm / totalKm, 0, 1);
            if (endRatio <= startRatio) continue;

            const segmentPolygon: [number, number][] = isLngDominant
              ? [
                  [
                    polygonBounds.minLat,
                    polygonBounds.minLng +
                      (polygonBounds.maxLng - polygonBounds.minLng) * startRatio,
                  ],
                  [
                    polygonBounds.maxLat,
                    polygonBounds.minLng +
                      (polygonBounds.maxLng - polygonBounds.minLng) * startRatio,
                  ],
                  [
                    polygonBounds.maxLat,
                    polygonBounds.minLng +
                      (polygonBounds.maxLng - polygonBounds.minLng) * endRatio,
                  ],
                  [
                    polygonBounds.minLat,
                    polygonBounds.minLng +
                      (polygonBounds.maxLng - polygonBounds.minLng) * endRatio,
                  ],
                ]
              : [
                  [
                    polygonBounds.minLat +
                      (polygonBounds.maxLat - polygonBounds.minLat) * startRatio,
                    polygonBounds.minLng,
                  ],
                  [
                    polygonBounds.minLat +
                      (polygonBounds.maxLat - polygonBounds.minLat) * endRatio,
                    polygonBounds.minLng,
                  ],
                  [
                    polygonBounds.minLat +
                      (polygonBounds.maxLat - polygonBounds.minLat) * endRatio,
                    polygonBounds.maxLng,
                  ],
                  [
                    polygonBounds.minLat +
                      (polygonBounds.maxLat - polygonBounds.minLat) * startRatio,
                    polygonBounds.maxLng,
                  ],
                ];

            const segmentLayer = leaflet.polygon(segmentPolygon, {
              color: getHeatColor(segment.floodRisk),
              fillColor: getHeatColor(segment.floodRisk),
              fillOpacity: 0.38,
              weight: 1,
            });

            const segmentDetails = [
              `<strong>Segment</strong>: ${segment.startKm}-${segment.endKm} km`,
              segment.avgSlope !== undefined
                ? `<strong>Avg Slope</strong>: ${segment.avgSlope}%`
                : null,
              segment.soilStability
                ? `<strong>Soil Stability</strong>: ${escapeHtml(segment.soilStability)}`
                : null,
              segment.floodRisk
                ? `<strong>Flood Risk</strong>: ${escapeHtml(segment.floodRisk)}`
                : null,
            ]
              .filter((line): line is string => line !== null)
              .join("<br/>");
            segmentLayer.bindPopup?.(segmentDetails);
            overlayLayer.addLayer(segmentLayer);
          }
        }
      }
    }

    if (boundsPoints.length > 0) {
      const bounds = leaflet.latLngBounds(boundsPoints);
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2), { animate: true });
        return;
      }
    }

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }, [data, isMapReady]);

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
      </div>
    </div>
  );
}
