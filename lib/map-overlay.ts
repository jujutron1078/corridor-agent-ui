import type { Message } from "@langchain/langgraph-sdk";

type UnknownRecord = Record<string, unknown>;

export type MapPoint = {
  label: string;
  latitude: number;
  longitude: number;
  confidence?: number;
};

export type MapOverlayData = {
  points: MapPoint[];
  polygon: [number, number][];
  corridorId?: string;
  terrainAnalysis?: TerrainAnalysis;
  noGoZones?: NoGoZone[];
  infrastructureDetections?: InfrastructureDetection[];
  routeVariants?: RouteVariant[];
};

export type TerrainSegmentAnalysis = {
  segmentId?: string;
  label?: string;
  country?: string;
  startKm: number;
  endKm: number;
  startCoordinate?: {
    latitude: number;
    longitude: number;
  };
  endCoordinate?: {
    latitude: number;
    longitude: number;
  };
  avgSlope?: number;
  soilStability?: string;
  floodRisk?: string;
  difficultyScore?: number;
};

export type TerrainAnalysis = {
  segmentAnalysis: TerrainSegmentAnalysis[];
  totalExcavationEstimateM3?: number;
  engineeringRecommendation?: string;
};

export type NoGoZone = {
  zoneId?: string;
  description: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  reason?: string;
  severity?: string;
  polygon?: [number, number][];
};

export type InfrastructureDetection = {
  detectionId?: string;
  type: string;
  subtype?: string;
  label: string;
  latitude: number;
  longitude: number;
  confidence?: number;
  verificationStatus?: string;
  gridInterconnectionPriority?: string;
  estimatedPowerDemandMw?: number;
  estimatedGenerationCapacityMw?: number;
  bbox?: {
    topLeft: {
      latitude: number;
      longitude: number;
    };
    bottomRight: {
      latitude: number;
      longitude: number;
    };
  };
};

export type RouteVariant = {
  variantId?: string;
  label: string;
  rank?: number;
  isRecommended?: boolean;
  route: [number, number][];
  distanceKm?: number;
  estimatedCostUsd?: number;
  estimatedDurationHours?: number;
};

/** Accepts SDK ToolCallWithResult and other shapes that have call/result. */
type ToolCallLike = {
  call?: unknown;
  result?: {
    content?: unknown;
  };
};

function toRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function parseGeoJsonPolygonCoordinates(geoJson: unknown): [number, number][] {
  const root = toRecord(geoJson);
  if (!root) return [];

  const geometry = root.type === "Feature" ? toRecord(root.geometry) : root;
  if (!geometry || geometry.type !== "Polygon") return [];

  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];
  const outerRing = coordinates[0];
  if (!Array.isArray(outerRing)) return [];

  return outerRing
    .map((pair): [number, number] | null => {
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const longitude = toNumber(pair[0]);
      const latitude = toNumber(pair[1]);
      if (latitude === null || longitude === null) return null;
      return [latitude, longitude];
    })
    .filter((pair): pair is [number, number] => pair !== null);
}

function parseGeoJsonLineCoordinates(geoJson: unknown): [number, number][] {
  const root = toRecord(geoJson);
  if (!root) return [];

  const geometry = root.type === "Feature" ? toRecord(root.geometry) : root;
  if (!geometry || geometry.type !== "LineString") return [];

  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates)) return [];

  return coordinates
    .map((pair): [number, number] | null => {
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const longitude = toNumber(pair[0]);
      const latitude = toNumber(pair[1]);
      if (latitude === null || longitude === null) return null;
      return [latitude, longitude];
    })
    .filter((pair): pair is [number, number] => pair !== null);
}

function parseLatLngArray(points: unknown): [number, number][] {
  if (!Array.isArray(points)) return [];

  return points
    .map((point): [number, number] | null => {
      if (Array.isArray(point) && point.length >= 2) {
        const first = toNumber(point[0]);
        const second = toNumber(point[1]);
        if (first === null || second === null) return null;

        // Heuristic: when the first value looks like longitude, swap to [lat, lng].
        if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
          return [second, first];
        }
        return [first, second];
      }

      const record = toRecord(point);
      if (!record) return null;
      const latitude = toNumber(record.latitude ?? record.lat);
      const longitude = toNumber(record.longitude ?? record.lng ?? record.lon);
      if (latitude === null || longitude === null) return null;
      return [latitude, longitude];
    })
    .filter((pair): pair is [number, number] => pair !== null);
}

function firstNonEmptyCoordinates(candidates: [number, number][][]): [number, number][] {
  return candidates.find((coords) => coords.length > 0) ?? [];
}

function parseToolContent(content: unknown): UnknownRecord | null {
  const parseJsonRecord = (value: string): UnknownRecord | null => {
    try {
      const parsed = JSON.parse(value) as unknown;
      return toRecord(parsed);
    } catch {
      return null;
    }
  };

  const unwrapPayloadRecord = (record: UnknownRecord): UnknownRecord | null => {
    if (
      "resolved_locations" in record ||
      "bounding_polygon_geojson" in record ||
      "segment_analysis" in record ||
      "terrain_segments" in record ||
      "no_go_zones" in record ||
      "constraints" in record ||
      "protected_area_conflicts" in record ||
      "wetland_and_water_body_conflicts" in record ||
      "detections" in record ||
      "route_variants" in record ||
      "optimized_routes" in record ||
      "routes" in record
    ) {
      return record;
    }

    const nestedContent = record.content;
    if (typeof nestedContent === "string") {
      const nested = parseJsonRecord(nestedContent);
      if (nested) return unwrapPayloadRecord(nested);
    }

    return null;
  };

  if (typeof content === "string") {
    const parsed = parseJsonRecord(content);
    if (!parsed) return null;
    return unwrapPayloadRecord(parsed);
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      const blockRecord = toRecord(block);
      if (!blockRecord) continue;
      const text = blockRecord.text;
      if (typeof text !== "string") continue;
      const parsed = parseJsonRecord(text);
      if (!parsed) continue;
      const unwrapped = unwrapPayloadRecord(parsed);
      if (unwrapped) return unwrapped;
    }
    return null;
  }

  const record = toRecord(content);
  if (!record) return null;
  return unwrapPayloadRecord(record);
}

function parseGeocodePoints(payload: UnknownRecord): MapPoint[] {
  const resolvedLocations = payload.resolved_locations;
  if (!Array.isArray(resolvedLocations)) return [];

  return resolvedLocations
    .map((location): MapPoint | null => {
      const item = toRecord(location);
      if (!item) return null;

      const latitude = toNumber(item.latitude);
      const longitude = toNumber(item.longitude);
      if (latitude === null || longitude === null) return null;

      return {
        label:
          typeof item.input_name === "string" && item.input_name.trim().length > 0
            ? item.input_name
            : "Location",
        latitude,
        longitude,
        confidence: toNumber(item.confidence) ?? undefined,
      };
    })
    .filter((point): point is MapPoint => point !== null);
}

function parsePolygonCoordinates(payload: UnknownRecord): [number, number][] {
  const candidates = [
    parseGeoJsonPolygonCoordinates(payload.bounding_polygon_geojson),
    parseGeoJsonPolygonCoordinates(payload.bounding_area_geojson),
    parseGeoJsonPolygonCoordinates(payload.corridor_polygon_geojson),
  ];
  return candidates.find((coords) => coords.length > 0) ?? [];
}

function parseTerrainAnalysis(payload: UnknownRecord): TerrainAnalysis | null {
  const rawSegments =
    (Array.isArray(payload.segment_analysis) ? payload.segment_analysis : null) ??
    (Array.isArray(payload.terrain_segments) ? payload.terrain_segments : null);
  if (!rawSegments) return null;

  const segmentAnalysis = rawSegments
    .map((segment): TerrainSegmentAnalysis | null => {
      const item = toRecord(segment);
      if (!item) return null;

      const startKm = toNumber(item.start_km ?? item.startKm ?? item.segment_start_km);
      const endKm = toNumber(item.end_km ?? item.endKm ?? item.segment_end_km);
      if (startKm === null || endKm === null) return null;

      const startCoordinateRecord = toRecord(item.start_coordinate ?? item.start_point);
      const endCoordinateRecord = toRecord(item.end_coordinate ?? item.end_point);
      const startCoordinateLatitude = toNumber(
        startCoordinateRecord?.latitude ?? startCoordinateRecord?.lat
      );
      const startCoordinateLongitude = toNumber(
        startCoordinateRecord?.longitude ?? startCoordinateRecord?.lng ?? startCoordinateRecord?.lon
      );
      const endCoordinateLatitude = toNumber(
        endCoordinateRecord?.latitude ?? endCoordinateRecord?.lat
      );
      const endCoordinateLongitude = toNumber(
        endCoordinateRecord?.longitude ?? endCoordinateRecord?.lng ?? endCoordinateRecord?.lon
      );
      const slopeAnalysis = toRecord(item.slope_analysis);
      const soilStabilityRecord = toRecord(item.soil_stability);
      const floodRiskRecord = toRecord(item.flood_risk);

      return {
        segmentId: toString(item.segment_id),
        label: toString(item.label),
        country: toString(item.country),
        startKm,
        endKm,
        startCoordinate:
          startCoordinateLatitude !== null && startCoordinateLongitude !== null
            ? {
                latitude: startCoordinateLatitude,
                longitude: startCoordinateLongitude,
              }
            : undefined,
        endCoordinate:
          endCoordinateLatitude !== null && endCoordinateLongitude !== null
            ? {
                latitude: endCoordinateLatitude,
                longitude: endCoordinateLongitude,
              }
            : undefined,
        avgSlope:
          toNumber(item.avg_slope) ??
          toNumber(slopeAnalysis?.avg_slope_degrees) ??
          toNumber(item.slope_percent) ??
          undefined,
        soilStability:
          toString(item.soil_stability) ?? toString(soilStabilityRecord?.classification),
        floodRisk: toString(item.flood_risk) ?? toString(floodRiskRecord?.classification),
        difficultyScore:
          toNumber(item.difficulty_score) ??
          toNumber(item.risk_score) ??
          toNumber(item.difficulty_index) ??
          undefined,
      };
    })
    .filter((segment): segment is TerrainSegmentAnalysis => segment !== null)
    .sort((left, right) => left.startKm - right.startKm);

  if (segmentAnalysis.length === 0) return null;

  return {
    segmentAnalysis,
    totalExcavationEstimateM3:
      toNumber(payload.total_excavation_estimate_m3) ??
      toNumber(toRecord(payload.corridor_summary)?.total_excavation_estimate_m3) ??
      undefined,
    engineeringRecommendation:
      toString(payload.engineering_recommendation) ??
      (Array.isArray(payload.engineering_recommendations) &&
      payload.engineering_recommendations.length > 0
        ? toString(toRecord(payload.engineering_recommendations[0])?.recommendation)
        : undefined),
  };
}

function centroidFromPolygon(polygon: [number, number][]): { latitude: number; longitude: number } | null {
  if (polygon.length === 0) return null;

  let latSum = 0;
  let lngSum = 0;
  for (const [lat, lng] of polygon) {
    latSum += lat;
    lngSum += lng;
  }

  return {
    latitude: latSum / polygon.length,
    longitude: lngSum / polygon.length,
  };
}

function parseNoGoZones(payload: UnknownRecord): NoGoZone[] {
  const zones =
    (Array.isArray(payload.no_go_zones) ? payload.no_go_zones : null) ??
    (Array.isArray(payload.constraints) ? payload.constraints : null);
  if (!zones) return [];

  return zones
    .map((zone): NoGoZone | null => {
      const item = toRecord(zone);
      if (!item) return null;

      const coordinates = toRecord(item.coordinates ?? item.center);
      const latitude = toNumber(coordinates?.latitude ?? coordinates?.lat);
      const longitude = toNumber(coordinates?.longitude ?? coordinates?.lng ?? coordinates?.lon);

      const polygon = firstNonEmptyCoordinates([
        parseGeoJsonPolygonCoordinates(item.polygon_geojson),
        parseGeoJsonPolygonCoordinates(item.geometry),
        parseGeoJsonPolygonCoordinates(item.geojson),
        parseLatLngArray(item.polygon_coordinates),
      ]);
      const centroid = polygon.length > 0 ? centroidFromPolygon(polygon) : null;

      const resolvedLatitude = latitude ?? centroid?.latitude;
      const resolvedLongitude = longitude ?? centroid?.longitude;
      if (resolvedLatitude === undefined || resolvedLongitude === undefined) {
        return null;
      }

      return {
        zoneId: toString(item.zone_id) ?? toString(item.id),
        description: toString(item.description) ?? toString(item.name) ?? "No-go zone",
        latitude: resolvedLatitude,
        longitude: resolvedLongitude,
        radiusKm: toNumber(item.radius_km ?? item.radiusKm) ?? undefined,
        reason: toString(item.reason),
        severity:
          toString(item.severity) ??
          toString(item.risk_level) ??
          toString(item.classification) ??
          undefined,
        polygon: polygon.length > 0 ? polygon : undefined,
      };
    })
    .filter((zone): zone is NoGoZone => zone !== null);
}

/** Parse protected_area_conflicts and wetland conflicts into NoGoZone[] (centroid + radius from overlap area). */
function parseEnvironmentalConflictZones(payload: UnknownRecord): NoGoZone[] {
  const zones: NoGoZone[] = [];

  const conflictArrays = [
    Array.isArray(payload.protected_area_conflicts) ? payload.protected_area_conflicts : [],
    Array.isArray(payload.wetland_and_water_body_conflicts) ? payload.wetland_and_water_body_conflicts : [],
  ] as unknown[][];

  for (const arr of conflictArrays) {
    for (const raw of arr) {
      const item = toRecord(raw);
      if (!item) continue;

      const centroid = toRecord(item.centroid);
      const lat = toNumber(centroid?.latitude ?? centroid?.lat);
      const lng = toNumber(centroid?.longitude ?? centroid?.lng ?? centroid?.lon);
      if (lat === null || lng === null) continue;

      const overlapSqkm =
        toNumber(item.overlap_with_corridor_buffer_sqkm) ?? toNumber(item.overlap_sqkm);
      const radiusKm =
        overlapSqkm !== null && overlapSqkm > 0
          ? Math.sqrt(overlapSqkm / Math.PI)
          : 3;
      const name = toString(item.name) ?? "Conflict zone";
      const riskLevel = toString(item.risk_level);

      zones.push({
        zoneId: toString(item.conflict_id) ?? toString(item.zone_id),
        description: name,
        latitude: lat,
        longitude: lng,
        radiusKm,
        reason: toString(item.recommended_action) ?? toString(item.reason),
        severity: riskLevel,
        polygon: undefined,
      });
    }
  }

  return zones;
}

function parseInfrastructureDetections(payload: UnknownRecord): InfrastructureDetection[] {
  const rawDetections = payload.detections;
  if (!Array.isArray(rawDetections)) return [];

  return rawDetections
    .map((detection): InfrastructureDetection | null => {
      const item = toRecord(detection);
      if (!item) return null;

      const coordinates = toRecord(item.coordinates);
      const latitude = toNumber(coordinates?.latitude);
      const longitude = toNumber(coordinates?.longitude);
      const type = typeof item.type === "string" ? item.type : null;
      if (latitude === null || longitude === null || !type) return null;

      const boundingBox = toRecord(item.bounding_box);
      const topLeft = toRecord(boundingBox?.top_left);
      const bottomRight = toRecord(boundingBox?.bottom_right);
      const topLeftLatitude = toNumber(topLeft?.latitude);
      const topLeftLongitude = toNumber(topLeft?.longitude);
      const bottomRightLatitude = toNumber(bottomRight?.latitude);
      const bottomRightLongitude = toNumber(bottomRight?.longitude);

      const anchorLoadClassification = toRecord(item.anchor_load_classification);

      return {
        detectionId:
          typeof item.detection_id === "string" && item.detection_id.trim().length > 0
            ? item.detection_id
            : undefined,
        type,
        subtype:
          typeof item.subtype === "string" && item.subtype.trim().length > 0
            ? item.subtype
            : undefined,
        label:
          typeof item.label === "string" && item.label.trim().length > 0
            ? item.label
            : type.replaceAll("_", " "),
        latitude,
        longitude,
        confidence: toNumber(item.confidence) ?? undefined,
        verificationStatus:
          typeof item.verification_status === "string" &&
          item.verification_status.trim().length > 0
            ? item.verification_status
            : undefined,
        gridInterconnectionPriority:
          typeof anchorLoadClassification?.grid_interconnection_priority === "string" &&
          anchorLoadClassification.grid_interconnection_priority.trim().length > 0
            ? anchorLoadClassification.grid_interconnection_priority
            : undefined,
        estimatedPowerDemandMw: toNumber(item.estimated_power_demand_mw) ?? undefined,
        estimatedGenerationCapacityMw:
          toNumber(item.estimated_generation_capacity_mw) ?? undefined,
        bbox:
          topLeftLatitude !== null &&
          topLeftLongitude !== null &&
          bottomRightLatitude !== null &&
          bottomRightLongitude !== null
            ? {
                topLeft: {
                  latitude: topLeftLatitude,
                  longitude: topLeftLongitude,
                },
                bottomRight: {
                  latitude: bottomRightLatitude,
                  longitude: bottomRightLongitude,
                },
              }
            : undefined,
      };
    })
    .filter((detection): detection is InfrastructureDetection => detection !== null);
}

function parseRouteFromSegments(segments: unknown): [number, number][] {
  if (!Array.isArray(segments)) return [];
  const allCoords: [number, number][] = [];
  for (const seg of segments) {
    const item = toRecord(seg);
    if (!item) continue;
    const segRoute = firstNonEmptyCoordinates([
      parseGeoJsonLineCoordinates(item.route_geojson ?? item.geometry),
      parseLatLngArray(item.coordinates ?? item.path_coordinates),
    ]);
    for (const p of segRoute) allCoords.push(p);
  }
  return allCoords;
}

function parseRouteVariants(payload: UnknownRecord): RouteVariant[] {
  const rawVariants =
    (Array.isArray(payload.route_variants) ? payload.route_variants : null) ??
    (Array.isArray(payload.optimized_routes) ? payload.optimized_routes : null) ??
    (Array.isArray(payload.routes) ? payload.routes : null);
  if (!rawVariants) return [];

  const recommendedId =
    toString(toRecord(payload.recommended_route)?.variant_id) ?? undefined;

  return rawVariants
    .map((variant): RouteVariant | null => {
      const item = toRecord(variant);
      if (!item) return null;

      const route = firstNonEmptyCoordinates([
        parseGeoJsonLineCoordinates(item.route_geojson),
        parseGeoJsonLineCoordinates(item.path_geojson),
        parseGeoJsonLineCoordinates(item.geometry),
        parseGeoJsonLineCoordinates(item.geojson),
        parseLatLngArray(item.coordinates),
        parseLatLngArray(item.path_coordinates),
        parseRouteFromSegments(item.segments),
      ]);
      if (route.length < 2) return null;

      const rank = toNumber(item.rank ?? item.variant_rank ?? item.priority) ?? undefined;
      const variantId =
        toString(item.variant_id) ?? toString(item.route_id) ?? toString(item.id) ?? undefined;
      const label =
        toString(item.label) ??
        toString(item.variant_name) ??
        toString(item.name) ??
        (rank !== undefined ? `ROUTE-V${rank}` : variantId ?? "Route variant");

      const totals = toRecord(item.totals);
      const netCapex = toNumber(totals?.net_capex_usd) ?? toNumber(item.estimated_cost_usd ?? item.cost_usd);

      return {
        variantId,
        label,
        rank,
        isRecommended:
          item.is_recommended === true ||
          item.recommended === true ||
          rank === 1 ||
          (recommendedId !== undefined && variantId === recommendedId),
        route,
        distanceKm:
          toNumber(item.distance_km ?? item.length_km ?? item.total_length_km) ??
          toNumber(totals?.total_length_km) ??
          undefined,
        estimatedCostUsd: netCapex ?? undefined,
        estimatedDurationHours:
          toNumber(item.estimated_duration_hours ?? item.travel_time_hours) ?? undefined,
      };
    })
    .filter((variant): variant is RouteVariant => variant !== null)
    .sort((left, right) => {
      const leftRank = left.rank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.rank ?? Number.MAX_SAFE_INTEGER;
      if (left.isRecommended && !right.isRecommended) return -1;
      if (!left.isRecommended && right.isRecommended) return 1;
      return leftRank - rightRank;
    });
}

function applyOverlayPayload(
  toolName: string | undefined,
  payload: UnknownRecord,
  current: MapOverlayData
): MapOverlayData {
  let nextPoints = current.points;
  let nextPolygon = current.polygon;
  let nextCorridorId = current.corridorId;
  let nextTerrainAnalysis = current.terrainAnalysis;
  let nextNoGoZones = current.noGoZones;
  let nextInfrastructureDetections = current.infrastructureDetections;
  let nextRouteVariants = current.routeVariants;

  if (toolName === "geocode_location") {
    nextPoints = parseGeocodePoints(payload);
  }

  if (toolName === "define_corridor" || toolName === "fetch_geospatial_layers") {
    const polygon = parsePolygonCoordinates(payload);
    if (polygon.length > 0) {
      nextPolygon = polygon;
    }
    nextCorridorId =
      toString(payload.corridor_id) ?? toString(payload.corridorId) ?? nextCorridorId;
  }

  if (toolName === "terrain_analysis") {
    nextTerrainAnalysis = parseTerrainAnalysis(payload) ?? nextTerrainAnalysis;
    const noGoZones = parseNoGoZones(payload);
    if (noGoZones.length > 0) {
      nextNoGoZones = noGoZones;
    }
  }

  if (
    toolName === "environmental_constraints"
  ) {
    const noGoZones = parseNoGoZones(payload);
    const conflictZones = parseEnvironmentalConflictZones(payload);
    const combined = [...noGoZones, ...conflictZones];
    if (combined.length > 0) {
      nextNoGoZones = combined;
    }
  }

  if (
    toolName === "infrastructure_detection" 
  ) {
    const detections = parseInfrastructureDetections(payload);
    if (detections.length > 0) {
      nextInfrastructureDetections = detections;
    }
  }

  if (
    toolName === "route_optimization"
  ) {
    const routeVariants = parseRouteVariants(payload);
    if (routeVariants.length > 0) {
      nextRouteVariants = routeVariants;
    }
  }

  return {
    points: nextPoints,
    polygon: nextPolygon,
    corridorId: nextCorridorId,
    terrainAnalysis: nextTerrainAnalysis,
    noGoZones: nextNoGoZones,
    infrastructureDetections: nextInfrastructureDetections,
    routeVariants: nextRouteVariants,
  };
}

function finalizeOverlayData(data: MapOverlayData): MapOverlayData | null {
  const hasTerrain =
    Boolean(data.terrainAnalysis?.engineeringRecommendation) ||
    (data.terrainAnalysis?.segmentAnalysis.length ?? 0) > 0;
  const hasNoGoZones = (data.noGoZones?.length ?? 0) > 0;
  const hasInfrastructure = (data.infrastructureDetections?.length ?? 0) > 0;
  const hasRouteVariants = (data.routeVariants?.length ?? 0) > 0;
  if (
    data.points.length === 0 &&
    data.polygon.length === 0 &&
    !hasTerrain &&
    !hasNoGoZones &&
    !hasInfrastructure &&
    !hasRouteVariants
  ) {
    return null;
  }
  return data;
}

export function extractMapOverlayData(messages: Message[]): MapOverlayData | null {
  let overlayData: MapOverlayData = {
    points: [],
    polygon: [],
    terrainAnalysis: undefined,
    noGoZones: undefined,
    infrastructureDetections: undefined,
    routeVariants: undefined,
  };

  for (const message of messages) {
    if (message.type !== "tool") continue;

    const toolMessage = message as Message & { name?: string };
    const payload = parseToolContent(toolMessage.content);
    if (!payload) continue;

    overlayData = applyOverlayPayload(toolMessage.name, payload, overlayData);
  }

  return finalizeOverlayData(overlayData);
}

export function extractMapOverlayDataFromToolCalls(toolCalls: ToolCallLike[]): MapOverlayData | null {
  let overlayData: MapOverlayData = {
    points: [],
    polygon: [],
    terrainAnalysis: undefined,
    noGoZones: undefined,
    infrastructureDetections: undefined,
    routeVariants: undefined,
  };

  for (const toolCall of toolCalls) {
    const call = toolCall.call as { name?: unknown } | null | undefined;
    const toolName = typeof call?.name === "string" ? call.name : undefined;
    const payload = parseToolContent(toolCall.result?.content);
    if (!toolName || !payload) continue;

    overlayData = applyOverlayPayload(toolName, payload, overlayData);
  }

  return finalizeOverlayData(overlayData);
}
