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
};

export type TerrainAnalysis = {
  segmentAnalysis: TerrainSegmentAnalysis[];
  totalExcavationEstimateM3?: number;
  engineeringRecommendation?: string;
};

export type NoGoZone = {
  zoneId?: string;
  description: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  reason?: string;
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
      "no_go_zones" in record ||
      "detections" in record
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
  const geoJsonRoot = toRecord(payload.bounding_polygon_geojson);
  if (!geoJsonRoot) return [];

  const geometry =
    geoJsonRoot.type === "Feature" ? toRecord(geoJsonRoot.geometry) : geoJsonRoot;

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

function parseTerrainAnalysis(payload: UnknownRecord): TerrainAnalysis | null {
  const rawSegments = payload.segment_analysis;
  if (!Array.isArray(rawSegments)) return null;

  const segmentAnalysis = rawSegments
    .map((segment): TerrainSegmentAnalysis | null => {
      const item = toRecord(segment);
      if (!item) return null;

      const startKm = toNumber(item.start_km);
      const endKm = toNumber(item.end_km);
      if (startKm === null || endKm === null) return null;

      const startCoordinateRecord = toRecord(item.start_coordinate);
      const endCoordinateRecord = toRecord(item.end_coordinate);
      const startCoordinateLatitude = toNumber(startCoordinateRecord?.latitude);
      const startCoordinateLongitude = toNumber(startCoordinateRecord?.longitude);
      const endCoordinateLatitude = toNumber(endCoordinateRecord?.latitude);
      const endCoordinateLongitude = toNumber(endCoordinateRecord?.longitude);
      const slopeAnalysis = toRecord(item.slope_analysis);
      const soilStabilityRecord = toRecord(item.soil_stability);
      const floodRiskRecord = toRecord(item.flood_risk);

      return {
        segmentId:
          typeof item.segment_id === "string" && item.segment_id.trim().length > 0
            ? item.segment_id
            : undefined,
        label:
          typeof item.label === "string" && item.label.trim().length > 0 ? item.label : undefined,
        country:
          typeof item.country === "string" && item.country.trim().length > 0
            ? item.country
            : undefined,
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
          undefined,
        soilStability:
          typeof item.soil_stability === "string" && item.soil_stability.trim().length > 0
            ? item.soil_stability
            : typeof soilStabilityRecord?.classification === "string" &&
                soilStabilityRecord.classification.trim().length > 0
              ? soilStabilityRecord.classification
            : undefined,
        floodRisk:
          typeof item.flood_risk === "string" && item.flood_risk.trim().length > 0
            ? item.flood_risk
            : typeof floodRiskRecord?.classification === "string" &&
                floodRiskRecord.classification.trim().length > 0
              ? floodRiskRecord.classification
            : undefined,
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
      typeof payload.engineering_recommendation === "string" &&
      payload.engineering_recommendation.trim().length > 0
        ? payload.engineering_recommendation
        : Array.isArray(payload.engineering_recommendations) &&
            payload.engineering_recommendations.length > 0
          ? (() => {
              const first = toRecord(payload.engineering_recommendations[0]);
              const recommendation = first?.recommendation;
              return typeof recommendation === "string" && recommendation.trim().length > 0
                ? recommendation
                : undefined;
            })()
        : undefined,
  };
}

function parseNoGoZones(payload: UnknownRecord): NoGoZone[] {
  const zones = payload.no_go_zones;
  if (!Array.isArray(zones)) return [];

  return zones
    .map((zone): NoGoZone | null => {
      const item = toRecord(zone);
      if (!item) return null;
      const coordinates = toRecord(item.coordinates);
      const latitude = toNumber(coordinates?.latitude);
      const longitude = toNumber(coordinates?.longitude);
      if (latitude === null || longitude === null) return null;

      return {
        zoneId:
          typeof item.zone_id === "string" && item.zone_id.trim().length > 0
            ? item.zone_id
            : undefined,
        description:
          typeof item.description === "string" && item.description.trim().length > 0
            ? item.description
            : "No-go zone",
        latitude,
        longitude,
        radiusKm: toNumber(item.radius_km) ?? undefined,
        reason:
          typeof item.reason === "string" && item.reason.trim().length > 0
            ? item.reason
            : undefined,
      };
    })
    .filter((zone): zone is NoGoZone => zone !== null);
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

  if (toolName === "geocode_location") {
    nextPoints = parseGeocodePoints(payload);
  }

  if (toolName === "define_corridor") {
    nextPolygon = parsePolygonCoordinates(payload);
    nextCorridorId =
      typeof payload.corridor_id === "string" && payload.corridor_id.trim().length > 0
        ? payload.corridor_id
        : nextCorridorId;
  }

  if (toolName === "terrain_analysis") {
    nextTerrainAnalysis = parseTerrainAnalysis(payload) ?? nextTerrainAnalysis;
    const noGoZones = parseNoGoZones(payload);
    if (noGoZones.length > 0) {
      nextNoGoZones = noGoZones;
    }
  }

  if (toolName === "infrastructure_detection") {
    const detections = parseInfrastructureDetections(payload);
    if (detections.length > 0) {
      nextInfrastructureDetections = detections;
    }
  }

  return {
    points: nextPoints,
    polygon: nextPolygon,
    corridorId: nextCorridorId,
    terrainAnalysis: nextTerrainAnalysis,
    noGoZones: nextNoGoZones,
    infrastructureDetections: nextInfrastructureDetections,
  };
}

function finalizeOverlayData(data: MapOverlayData): MapOverlayData | null {
  const hasTerrain =
    Boolean(data.terrainAnalysis?.engineeringRecommendation) ||
    (data.terrainAnalysis?.segmentAnalysis.length ?? 0) > 0;
  const hasNoGoZones = (data.noGoZones?.length ?? 0) > 0;
  const hasInfrastructure = (data.infrastructureDetections?.length ?? 0) > 0;
  if (
    data.points.length === 0 &&
    data.polygon.length === 0 &&
    !hasTerrain &&
    !hasNoGoZones &&
    !hasInfrastructure
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
