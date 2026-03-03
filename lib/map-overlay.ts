import type { Message } from "@langchain/langgraph-sdk";

type UnknownRecord = Record<string, unknown>;

export type MapPoint = {
  label: string;
  latitude: number;
  longitude: number;
  confidence?: number;
  anchorId?: string;
  detectionId?: string;
  sector?: string;
  subSector?: string;
  country?: string;
  operator?: string;
  registrySource?: string;
  identityConfidence?: string;
  resolutionNote?: string;
};

export type MapOverlayData = {
  points: MapPoint[];
  polygon: [number, number][];
  corridorId?: string;
  terrainAnalysis?: TerrainAnalysis;
  noGoZones?: NoGoZone[];
  infrastructureDetections?: InfrastructureDetection[];
  routeVariants?: RouteVariant[];
  anchorLoadsCount?: number;
  currentDemand?: CurrentDemandAnalysis;
  bankability?: BankabilityAnalysis;
  growthTrajectory?: GrowthTrajectoryAnalysis;
  economicGaps?: EconomicGap[];
  economicGapSummary?: EconomicGapSummary;
  prioritizedOpportunities?: PrioritizedOpportunity[];
  opportunitySummary?: OpportunitySummary;
  colocationSummary?: ColocationSummary;
};

export type EconomicGap = {
  gapId: string;
  name: string;
  gapType: string;
  severity: string;
  investmentPriority: string;
  location?: string;
  countrySpan: string[];
  latitude: number;
  longitude: number;
  unmetDemandMw?: number;
  addressableDemandMw?: number;
  netCapexUsdM?: number;
  estimatedCapexUsdM?: number;
  coLocationSavingsUsdM?: number;
  primaryConstraint?: string;
  economicImpact?: string;
  recommendedIntervention?: string;
  anchorsAffected?: string[];
  isConditional?: boolean;
};

export type EconomicGapSummary = {
  totalGaps?: number;
  gapsFound?: number;
  totalUnmetDemandMw?: number;
  totalAddressableDemandMw?: number;
  totalNetCapexUsdM?: number;
};

export type PrioritizedOpportunity = {
  rank: number;
  anchorId: string;
  detectionId?: string;
  name: string;
  sector?: string;
  subSector?: string;
  country?: string;
  phase?: string;
  gapsAddressed: string[];
  compositeScore?: number;
  bankabilityTier?: string;
  bankabilityScore?: number;
  reliabilityClass?: string;
  currentMw?: number;
  year5Mw?: number;
  year10Mw?: number;
  estimatedAnnualRevenueUsdM?: number;
  phaseCapexContributionUsdM?: number;
  recommendedAction?: string;
  rationale?: string;
};

export type OpportunitySummary = {
  totalAnchorsRanked?: number;
  phase1Count?: number;
  phase2Count?: number;
  phase3Count?: number;
};

export type ColocationVariant = {
  variantId: string;
  label: string;
  refinedLengthKm?: number;
  refinedHighwayOverlapPct?: number;
  totalColocationSavingsUsd?: number;
  savingsAsPctOfGrossCapex?: number;
  netCapexUsd?: number;
};

export type ColocationSummary = {
  recommendedVariant?: string;
  recommendationRationale?: string;
  savingsMethodology?: {
    description?: string;
    greenfieldUnitCosts?: Record<string, number>;
    coLocationUnitCosts?: Record<string, number>;
    savingsRatePerCategory?: Record<string, string>;
  };
  variants: ColocationVariant[];
};

export type CurrentDemandProfile = {
  anchorId: string;
  detectionId?: string;
  name: string;
  country?: string;
  sector: string;
  subSector?: string;
  currentMw: number;
  loadFactor: number;
  reliabilityClass: string;
  reliabilityRationale?: string;
  demandBasis?: string;
};

export type CurrentDemandAnalysis = {
  totalCurrentMw: number;
  demandProfiles: CurrentDemandProfile[];
};

export type BankabilityProfile = {
  anchorId: string;
  detectionId?: string;
  name: string;
  country?: string;
  score: number;
  tier?: string;
  offtakeWillingness?: string;
  financialStrength?: string;
  contractReadiness?: string;
  rationale?: string;
  creditEnhancementRequired?: string;
};

export type BankabilityAnalysis = {
  corridorAverageScore?: number;
  anchorLoadsAssessed?: number;
  tier1Count?: number;
  tier2Count?: number;
  tier3Count?: number;
  profiles: BankabilityProfile[];
};

export type GrowthTrajectoryProfile = {
  anchorId: string;
  detectionId?: string;
  name: string;
  country?: string;
  bankabilityTier?: string;
  currentMw: number;
  year5Mw?: number;
  year10Mw?: number;
  year20Mw?: number;
  cagr?: string;
  growthDriverType?: string;
  growthDriver?: string;
  confidenceBand?: string;
};

export type GrowthTrajectoryAnalysis = {
  projectionSummary?: string;
  aggregateCurrentMw?: number;
  aggregateYear5Mw?: number;
  aggregateYear10Mw?: number;
  aggregateYear20Mw?: number;
  aggregateGrowthPct?: string;
  profiles: GrowthTrajectoryProfile[];
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
  category?: string;
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
  matchedKnownAsset?: boolean;
  isAnchorLoad?: boolean;
  isGenerationAsset?: boolean;
  isRoadSafetyRisk?: boolean;
  riskSeverity?: string;
  reviewReason?: string;
  changeNote?: string;
  isNewSinceLastCensus?: boolean;
  constructionActivityDetected?: boolean;
  lastCensusDate?: string;
  facilityAttributes?: Record<string, string | number | boolean>;
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
  description?: string;
  compositeScore?: number;
  straightLineOverheadPct?: number;
  weightedAvgHighwayOverlapPct?: number;
  anchorLoadsWithin15Km?: number;
  anchorLoadsDirectlyServed?: number;
  grossCapexUsd?: number;
  coLocationSavingUsd?: number;
  coLocationSavingPct?: number;
  distanceKm?: number;
  estimatedCostUsd?: number;
  estimatedDurationHours?: number;
  keyTradeoff?: string;
  equityIrrPct?: number;
  projectIrrPct?: number;
  paybackYears?: number;
  throughputGwh?: number;
  revenueUsd?: number;
  ebitdaUsd?: number;
  roadSafetyScore?: number;
  roadSafetyScoreRationale?: string;
  totalSafetyMitigationCapexUsd?: number;
  combinedNetCapexIncludingSafetyUsd?: number;
  safetyCapexAsPctOfNetCapex?: number;
  safetyConflictsFullyMitigated?: number;
  safetyConflictsPartiallyMitigated?: number;
  safetyConflictsAvoidedByRouting?: number;
  ess4PriorActionsAddressed?: number;
  esgComplianceRating?: string;
  scoringBreakdown?: {
    capexScore?: number;
    terrainScore?: number;
    environmentalScore?: number;
    coLocationScore?: number;
    anchorLoadCoverage?: number;
    roadSafetyScore?: number;
    roadSafetyScoreRationale?: string;
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

function toString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function toPrimitiveAttributeValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value) && value.length > 0) {
    const joined = value
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (typeof entry === "number" && Number.isFinite(entry)) return String(entry);
        if (typeof entry === "boolean") return entry ? "true" : "false";
        return "";
      })
      .filter((entry) => entry.length > 0)
      .join(", ");
    return joined.length > 0 ? joined : undefined;
  }
  return undefined;
}

function toAttributeRecord(value: unknown): Record<string, string | number | boolean> | undefined {
  const record = toRecord(value);
  if (!record) return undefined;

  const normalizedEntries = Object.entries(record)
    .map(([key, rawValue]) => [key, toPrimitiveAttributeValue(rawValue)] as const)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined);

  if (normalizedEntries.length === 0) return undefined;
  return Object.fromEntries(normalizedEntries);
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
      "human_safety_conflicts" in record ||
      "detections" in record ||
      "anchor_catalog" in record ||
      "total_anchors_identified" in record ||
      "demand_profiles" in record ||
      "total_current_mw" in record ||
      "bankability_scores" in record ||
      "corridor_average_score" in record ||
      "tier_summary" in record ||
      "trajectories" in record ||
      "projection_summary" in record ||
      "aggregate_trajectory" in record ||
      "gaps_found" in record ||
      "gaps" in record ||
      "corridor_gap_summary" in record ||
      "priority_list" in record ||
      "total_anchors_ranked" in record ||
      "phased_roadmap" in record ||
      "route_variants" in record ||
      "optimized_routes" in record ||
      "routes" in record ||
      "refined_variants" in record ||
      "refined_coordinates" in record ||
      "refined_route_geojson" in record ||
      "variant_colocation_analysis" in record ||
      "comparative_summary" in record
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

function parseAnchorLoadPoints(payload: UnknownRecord): MapPoint[] {
  const anchors = payload.anchor_catalog;
  if (!Array.isArray(anchors)) return [];

  return anchors
    .map((anchor): MapPoint | null => {
      const item = toRecord(anchor);
      if (!item) return null;

      const coords = item.coords;
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (Array.isArray(coords) && coords.length >= 2) {
        latitude = toNumber(coords[0]);
        longitude = toNumber(coords[1]);
      } else {
        const coordRecord = toRecord(coords);
        latitude = toNumber(coordRecord?.latitude ?? coordRecord?.lat);
        longitude = toNumber(coordRecord?.longitude ?? coordRecord?.lng ?? coordRecord?.lon);
      }

      if (latitude === null || longitude === null) return null;

      return {
        label: toString(item.entity_name) ?? toString(item.name) ?? "Detected facility",
        latitude,
        longitude,
        anchorId: toString(item.anchor_id),
        detectionId: toString(item.detection_id),
        sector: toString(item.sector),
        subSector: toString(item.sub_sector),
        country: toString(item.country),
        operator: toString(item.operator),
        registrySource: toString(item.registry_source),
        identityConfidence: toString(item.identity_confidence),
        resolutionNote: toString(item.resolution_note),
      };
    })
    .filter((point): point is MapPoint => point !== null);
}

function parseCurrentDemandAnalysis(
  payload: UnknownRecord,
  points: MapPoint[]
): CurrentDemandAnalysis | null {
  const rawProfiles = payload.demand_profiles;
  if (!Array.isArray(rawProfiles)) return null;

  const pointByAnchorId = new Map<string, MapPoint>();
  for (const point of points) {
    if (!point.anchorId) continue;
    pointByAnchorId.set(point.anchorId, point);
  }

  const demandProfiles = rawProfiles
    .map((profile): CurrentDemandProfile | null => {
      const item = toRecord(profile);
      if (!item) return null;

      const anchorId = toString(item.anchor_id);
      const currentMw = toNumber(item.current_mw);
      const loadFactor = toNumber(item.load_factor);
      if (!anchorId || currentMw === null || loadFactor === null) return null;

      const linkedPoint = pointByAnchorId.get(anchorId);

      return {
        anchorId,
        detectionId: toString(item.detection_id) ?? linkedPoint?.detectionId,
        name: toString(item.entity_name) ?? linkedPoint?.label ?? anchorId,
        country: toString(item.country) ?? linkedPoint?.country,
        sector: toString(item.sector) ?? linkedPoint?.sector ?? "Unknown",
        subSector: toString(item.sub_sector) ?? linkedPoint?.subSector,
        currentMw,
        loadFactor,
        reliabilityClass: toString(item.reliability_class) ?? "Unknown",
        reliabilityRationale: toString(item.reliability_rationale),
        demandBasis: toString(item.demand_basis),
      };
    })
    .filter((profile): profile is CurrentDemandProfile => profile !== null);

  if (demandProfiles.length === 0) return null;

  const totalCurrentMw =
    toNumber(payload.total_current_mw) ??
    demandProfiles.reduce((sum, profile) => sum + profile.currentMw, 0);

  return {
    totalCurrentMw,
    demandProfiles,
  };
}

function parseBankabilityAnalysis(payload: UnknownRecord): BankabilityAnalysis | null {
  const rawScores = payload.bankability_scores;
  if (!Array.isArray(rawScores)) return null;

  const tierSummary = toRecord(payload.tier_summary);

  const profiles = rawScores
    .map((entry): BankabilityProfile | null => {
      const item = toRecord(entry);
      if (!item) return null;

      const anchorId = toString(item.anchor_id);
      const score = toNumber(item.score);
      if (!anchorId || score === null) return null;

      return {
        anchorId,
        detectionId: toString(item.detection_id),
        name: toString(item.entity_name) ?? anchorId,
        country: toString(item.country),
        score,
        tier: toString(item.tier),
        offtakeWillingness: toString(item.offtake_willingness),
        financialStrength: toString(item.financial_strength),
        contractReadiness: toString(item.contract_readiness),
        rationale: toString(item.rationale),
        creditEnhancementRequired: toString(item.credit_enhancement_required),
      };
    })
    .filter((profile): profile is BankabilityProfile => profile !== null);

  if (profiles.length === 0) return null;

  return {
    corridorAverageScore: toNumber(payload.corridor_average_score) ?? undefined,
    anchorLoadsAssessed: toNumber(payload.anchor_loads_assessed) ?? undefined,
    tier1Count: toNumber(tierSummary?.tier_1_count) ?? undefined,
    tier2Count: toNumber(tierSummary?.tier_2_count) ?? undefined,
    tier3Count: toNumber(tierSummary?.tier_3_count) ?? undefined,
    profiles,
  };
}

function parseGrowthTrajectoryAnalysis(payload: UnknownRecord): GrowthTrajectoryAnalysis | null {
  const rawTrajectories = payload.trajectories;
  if (!Array.isArray(rawTrajectories)) return null;

  const aggregateTrajectory = toRecord(payload.aggregate_trajectory);
  const baseCase = toRecord(aggregateTrajectory?.base_case);

  const profiles = rawTrajectories
    .map((entry): GrowthTrajectoryProfile | null => {
      const item = toRecord(entry);
      if (!item) return null;

      const anchorId = toString(item.anchor_id);
      const currentMw = toNumber(item.current_mw);
      if (!anchorId || currentMw === null) return null;

      return {
        anchorId,
        detectionId: toString(item.detection_id),
        name: toString(item.entity_name) ?? anchorId,
        country: toString(item.country),
        bankabilityTier: toString(item.bankability_tier),
        currentMw,
        year5Mw: toNumber(item.year_5_mw) ?? undefined,
        year10Mw: toNumber(item.year_10_mw) ?? undefined,
        year20Mw: toNumber(item.year_20_mw) ?? undefined,
        cagr: toString(item.cagr),
        growthDriverType: toString(item.growth_driver_type),
        growthDriver: toString(item.growth_driver),
        confidenceBand: toString(item.confidence_band),
      };
    })
    .filter((profile): profile is GrowthTrajectoryProfile => profile !== null);

  if (profiles.length === 0) return null;

  return {
    projectionSummary: toString(payload.projection_summary),
    aggregateCurrentMw: toNumber(baseCase?.current_mw) ?? undefined,
    aggregateYear5Mw: toNumber(baseCase?.year_5_mw) ?? undefined,
    aggregateYear10Mw: toNumber(baseCase?.year_10_mw) ?? undefined,
    aggregateYear20Mw: toNumber(baseCase?.year_20_mw) ?? undefined,
    aggregateGrowthPct: toString(baseCase?.overall_growth_pct),
    profiles,
  };
}

function parsePolygonCoordinates(payload: UnknownRecord): [number, number][] {
  const jobMetadata = toRecord(payload.job_metadata);
  const candidates = [
    parseGeoJsonPolygonCoordinates(payload.bounding_polygon_geojson),
    parseGeoJsonPolygonCoordinates(payload.bounding_area_geojson),
    parseGeoJsonPolygonCoordinates(payload.corridor_polygon_geojson),
    parseGeoJsonPolygonCoordinates(payload.corridor_boundary),
    parseGeoJsonPolygonCoordinates(jobMetadata?.corridor_boundary),
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
        category: toString(item.category),
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

/** Parse environmental and human safety conflicts into NoGoZone[] using available centroid/coordinate + radius data. */
function parseConstraintConflictZones(payload: UnknownRecord): NoGoZone[] {
  const zones: NoGoZone[] = [];

  const environmentalConflictArrays = [
    Array.isArray(payload.protected_area_conflicts) ? payload.protected_area_conflicts : [],
    Array.isArray(payload.wetland_and_water_body_conflicts) ? payload.wetland_and_water_body_conflicts : [],
  ] as unknown[][];

  for (const arr of environmentalConflictArrays) {
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
        category: "environmental",
        latitude: lat,
        longitude: lng,
        radiusKm,
        reason: toString(item.recommended_action) ?? toString(item.reason),
        severity: riskLevel,
        polygon: undefined,
      });
    }
  }

  const safetyConflicts = Array.isArray(payload.human_safety_conflicts)
    ? payload.human_safety_conflicts
    : [];
  for (const raw of safetyConflicts) {
    const item = toRecord(raw);
    if (!item) continue;

    const coordinates = toRecord(item.coordinates);
    const lat = toNumber(coordinates?.latitude ?? coordinates?.lat);
    const lng = toNumber(coordinates?.longitude ?? coordinates?.lng ?? coordinates?.lon);
    if (lat === null || lng === null) continue;

    const bufferMeters = toNumber(item.buffer_zone_m);
    const bufferKm =
      bufferMeters !== null && bufferMeters > 0 ? bufferMeters / 1000 : 0.2;
    const name = toString(item.name) ?? "Human safety conflict";
    const subtype = toString(item.subtype);
    const riskLevel = toString(item.risk_level);

    zones.push({
      zoneId: toString(item.conflict_id) ?? toString(item.zone_id),
      description: subtype ? `${name} (${subtype})` : name,
      category: "human_safety",
      latitude: lat,
      longitude: lng,
      radiusKm: bufferKm,
      reason: toString(item.recommended_action) ?? toString(item.reason),
      severity: riskLevel,
      polygon: undefined,
    });
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
      const changeDetection = toRecord(item.change_detection);

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
        matchedKnownAsset: toBoolean(item.matched_known_asset),
        isAnchorLoad: toBoolean(item.is_anchor_load ?? item.isAnchorLoad),
        isGenerationAsset: toBoolean(item.is_generation_asset ?? item.isGenerationAsset),
        isRoadSafetyRisk: toBoolean(item.is_road_safety_risk ?? item.isRoadSafetyRisk),
        riskSeverity: toString(item.risk_severity),
        reviewReason: toString(item.review_reason),
        changeNote: toString(changeDetection?.change_note),
        isNewSinceLastCensus: toBoolean(changeDetection?.is_new_since_last_census),
        constructionActivityDetected: toBoolean(changeDetection?.construction_activity_detected),
        lastCensusDate: toString(changeDetection?.last_census_date),
        facilityAttributes: toAttributeRecord(item.facility_attributes),
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
      const scoringBreakdown = toRecord(item.scoring_breakdown);
      const financialIndicators = toRecord(item.financial_indicators);

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
        description: toString(item.description) ?? undefined,
        compositeScore: toNumber(item.composite_score) ?? undefined,
        straightLineOverheadPct: toNumber(item.vs_straight_line_overhead_pct) ?? undefined,
        weightedAvgHighwayOverlapPct:
          toNumber(totals?.weighted_avg_highway_overlap_pct) ?? undefined,
        anchorLoadsWithin15Km: toNumber(totals?.anchor_loads_within_15km) ?? undefined,
        anchorLoadsDirectlyServed: toNumber(totals?.anchor_loads_directly_served) ?? undefined,
        grossCapexUsd: toNumber(totals?.gross_capex_usd) ?? undefined,
        coLocationSavingUsd: toNumber(totals?.total_co_location_saving_usd) ?? undefined,
        coLocationSavingPct: toNumber(totals?.co_location_saving_pct) ?? undefined,
        distanceKm:
          toNumber(item.distance_km ?? item.length_km ?? item.total_length_km) ??
          toNumber(totals?.total_length_km) ??
          undefined,
        estimatedCostUsd: netCapex ?? undefined,
        estimatedDurationHours:
          toNumber(item.estimated_duration_hours ?? item.travel_time_hours) ?? undefined,
        keyTradeoff: toString(item.key_tradeoff) ?? undefined,
        equityIrrPct: toNumber(financialIndicators?.indicative_equity_irr_pct) ?? undefined,
        projectIrrPct: toNumber(financialIndicators?.indicative_project_irr_pct) ?? undefined,
        paybackYears: toNumber(financialIndicators?.indicative_payback_years) ?? undefined,
        throughputGwh: toNumber(financialIndicators?.estimated_year5_throughput_gwh) ?? undefined,
        revenueUsd: toNumber(financialIndicators?.estimated_year5_revenue_usd) ?? undefined,
        ebitdaUsd: toNumber(financialIndicators?.estimated_year5_ebitda_usd) ?? undefined,
        roadSafetyScore:
          toNumber(scoringBreakdown?.road_safety_score) ??
          toNumber(item.road_safety_score) ??
          undefined,
        roadSafetyScoreRationale:
          toString(scoringBreakdown?.road_safety_score_rationale) ??
          toString(item.road_safety_score_rationale) ??
          undefined,
        totalSafetyMitigationCapexUsd:
          toNumber(totals?.total_safety_mitigation_capex_usd) ?? undefined,
        combinedNetCapexIncludingSafetyUsd:
          toNumber(totals?.combined_net_capex_including_safety_usd) ?? undefined,
        safetyCapexAsPctOfNetCapex:
          toNumber(totals?.safety_capex_as_pct_of_net_capex) ?? undefined,
        safetyConflictsFullyMitigated:
          toNumber(totals?.safety_conflicts_fully_mitigated) ?? undefined,
        safetyConflictsPartiallyMitigated:
          toNumber(totals?.safety_conflicts_partially_mitigated) ?? undefined,
        safetyConflictsAvoidedByRouting:
          toNumber(totals?.safety_conflicts_avoided_by_routing) ?? undefined,
        ess4PriorActionsAddressed:
          toNumber(totals?.ess4_prior_actions_addressed) ?? undefined,
        esgComplianceRating:
          toString(totals?.esg_compliance_rating) ?? undefined,
        scoringBreakdown:
          scoringBreakdown !== null
            ? {
                capexScore: toNumber(scoringBreakdown.capex_score) ?? undefined,
                terrainScore: toNumber(scoringBreakdown.terrain_score) ?? undefined,
                environmentalScore: toNumber(scoringBreakdown.environmental_score) ?? undefined,
                coLocationScore: toNumber(scoringBreakdown.co_location_score) ?? undefined,
                anchorLoadCoverage: toNumber(scoringBreakdown.anchor_load_coverage) ?? undefined,
                roadSafetyScore: toNumber(scoringBreakdown.road_safety_score) ?? undefined,
                roadSafetyScoreRationale:
                  toString(scoringBreakdown.road_safety_score_rationale) ?? undefined,
              }
            : undefined,
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

function parseRefinedRouteVariants(payload: UnknownRecord): RouteVariant[] {
  const rawVariants = Array.isArray(payload.refined_variants) ? payload.refined_variants : null;
  if (!rawVariants) {
    const singleRefinedRoute = firstNonEmptyCoordinates([
      parseGeoJsonLineCoordinates(payload.refined_route_geojson),
      parseLatLngArray(payload.refined_coordinates),
    ]);
    if (singleRefinedRoute.length < 2) return [];
    return [
      {
        variantId: "REFINED-ROUTE",
        label: "Refined Route",
        rank: 1,
        isRecommended: true,
        route: singleRefinedRoute,
      },
    ];
  }

  const refinementSummary = toRecord(payload.refinement_summary);
  const recommendedVariantId = toString(refinementSummary?.recommended_variant_post_refinement);

  return rawVariants
    .map((variant, index): RouteVariant | null => {
      const item = toRecord(variant);
      if (!item) return null;

      const route = parseGeoJsonLineCoordinates(item.refined_route_geojson);
      if (route.length < 2) return null;

      const rank = index + 1;
      const variantId = toString(item.id) ?? toString(item.source_variant_id) ?? undefined;
      const label =
        toString(item.label) ?? (variantId !== undefined ? variantId : `Refined Route ${rank}`);

      const metricScores = toRecord(item.metric_scores);
      const terrainScore = toNumber(toRecord(metricScores?.terrain_slope)?.score) ?? undefined;
      const environmentalScore =
        toNumber(toRecord(metricScores?.environmental_sensitivity)?.score) ?? undefined;
      const landCostScore =
        toNumber(toRecord(metricScores?.land_acquisition_cost)?.score) ?? undefined;
      const constructionScore =
        toNumber(toRecord(metricScores?.construction_logistics)?.score) ?? undefined;

      return {
        variantId,
        label,
        rank,
        isRecommended:
          (recommendedVariantId !== undefined && variantId === recommendedVariantId) ||
          (recommendedVariantId === undefined && rank === 1),
        route,
        description: toString(item.length_delta_reason) ?? undefined,
        compositeScore: toNumber(item.composite_score) ?? undefined,
        distanceKm: toNumber(item.refined_length_km ?? item.geospatial_length_km) ?? undefined,
        weightedAvgHighwayOverlapPct:
          toNumber(item.refined_highway_overlap_pct ?? item.geospatial_highway_overlap_pct) ??
          undefined,
        scoringBreakdown:
          metricScores !== null
            ? {
                terrainScore,
                environmentalScore,
                capexScore: landCostScore,
                coLocationScore: constructionScore,
              }
            : undefined,
      };
    })
    .filter((variant): variant is RouteVariant => variant !== null);
}

function parseEconomicGapAnalysis(
  payload: UnknownRecord
): { gaps: EconomicGap[]; summary: EconomicGapSummary } | null {
  const rawGaps =
    (Array.isArray(payload.gaps) ? payload.gaps : null) ??
    (Array.isArray(payload.economic_gaps) ? payload.economic_gaps : null) ??
    (Array.isArray(payload.gap_list) ? payload.gap_list : null) ??
    (Array.isArray(payload.gap_candidates) ? payload.gap_candidates : null);
  if (!Array.isArray(rawGaps)) return null;

  const gaps = rawGaps
    .map((entry): EconomicGap | null => {
      const item = toRecord(entry);
      if (!item) return null;

      const coords = toRecord(item.coords ?? item.coordinates ?? item.location_coords);
      const location = toRecord(item.location);
      const latitude =
        toNumber(coords?.latitude ?? coords?.lat ?? location?.latitude ?? location?.lat ?? item.latitude) ??
        (Array.isArray(item.coords) ? toNumber(item.coords[0]) : null);
      const longitude =
        toNumber(
          coords?.longitude ?? coords?.lng ?? coords?.lon ?? location?.longitude ?? location?.lng ?? item.longitude
        ) ?? (Array.isArray(item.coords) ? toNumber(item.coords[1]) : null);
      if (latitude === null || longitude === null) return null;

      const gapId = toString(item.gap_id) ?? toString(item.id);
      const name = toString(item.name) ?? toString(item.gap_name);
      const gapType = toString(item.gap_type) ?? toString(item.type);
      const severity = toString(item.severity) ?? toString(item.risk_level);
      const investmentPriority =
        toString(item.investment_priority) ?? toString(item.phase) ?? toString(item.priority_phase);
      if (!gapId || !name || !gapType || !severity || !investmentPriority) return null;

      const rawCountrySpan = item.country_span ?? item.countries;
      const countrySpan = Array.isArray(rawCountrySpan)
        ? rawCountrySpan
            .map((country) => toString(country))
            .filter((country): country is string => Boolean(country))
        : [];
      const anchorsAffected = Array.isArray(item.anchors_affected)
        ? item.anchors_affected
            .map((anchor) => toString(anchor))
            .filter((anchor): anchor is string => Boolean(anchor))
        : undefined;

      const intervention = toString(item.recommended_intervention);
      const primaryConstraint = toString(item.primary_constraint);
      const isConditional =
        (intervention ?? "").toLowerCase().includes("conditional") ||
        (primaryConstraint ?? "").toLowerCase().includes("conditional");

      return {
        gapId,
        name,
        gapType,
        severity,
        investmentPriority,
        location: toString(item.location),
        countrySpan,
        latitude,
        longitude,
        unmetDemandMw:
          toNumber(item.unmet_demand_mw ?? item.unmet_mw ?? item.demand_gap_mw) ?? undefined,
        addressableDemandMw:
          toNumber(item.addressable_demand_mw ?? item.addressable_mw) ?? undefined,
        netCapexUsdM:
          toNumber(item.net_capex_usd_m ?? item.net_capex_musd ?? item.net_capex_usd_mn) ?? undefined,
        estimatedCapexUsdM:
          toNumber(item.estimated_capex_usd_m ?? item.estimated_capex_musd) ?? undefined,
        coLocationSavingsUsdM: toNumber(item.co_location_savings_usd_m) ?? undefined,
        primaryConstraint,
        economicImpact: toString(item.economic_impact),
        recommendedIntervention: intervention,
        anchorsAffected,
        isConditional,
      };
    })
    .filter((gap): gap is EconomicGap => gap !== null);

  if (gaps.length === 0) return null;

  const corridorSummary = toRecord(payload.corridor_gap_summary);
  const summary: EconomicGapSummary = {
    totalGaps: toNumber(corridorSummary?.total_gaps) ?? undefined,
    gapsFound: toNumber(payload.gaps_found) ?? undefined,
    totalUnmetDemandMw:
      toNumber(payload.total_unmet_demand_mw) ??
      toNumber(corridorSummary?.total_unmet_demand_mw) ??
      undefined,
    totalAddressableDemandMw: toNumber(corridorSummary?.total_addressable_demand_mw) ?? undefined,
    totalNetCapexUsdM: toNumber(corridorSummary?.total_net_capex_usd_m) ?? undefined,
  };

  return { gaps, summary };
}

function parsePrioritizedOpportunities(
  payload: UnknownRecord
): { opportunities: PrioritizedOpportunity[]; summary: OpportunitySummary } | null {
  const rawPriorityList = payload.priority_list;
  if (!Array.isArray(rawPriorityList)) return null;

  const opportunities = rawPriorityList
    .map((entry): PrioritizedOpportunity | null => {
      const item = toRecord(entry);
      if (!item) return null;

      const rank = toNumber(item.rank);
      const anchorId = toString(item.anchor_id);
      const name = toString(item.name);
      if (rank === null || !anchorId || !name) return null;

      const gapsAddressed = Array.isArray(item.gaps_addressed)
        ? item.gaps_addressed
            .map((gap) => toString(gap))
            .filter((gap): gap is string => Boolean(gap))
        : [];

      return {
        rank,
        anchorId,
        detectionId: toString(item.detection_id),
        name,
        sector: toString(item.sector),
        subSector: toString(item.sub_sector),
        country: toString(item.country),
        phase: toString(item.phase),
        gapsAddressed,
        compositeScore: toNumber(item.composite_score) ?? undefined,
        bankabilityTier: toString(item.bankability_tier),
        bankabilityScore: toNumber(item.bankability_score) ?? undefined,
        reliabilityClass: toString(item.reliability_class),
        currentMw: toNumber(item.current_mw) ?? undefined,
        year5Mw: toNumber(item.year_5_mw) ?? undefined,
        year10Mw: toNumber(item.year_10_mw) ?? undefined,
        estimatedAnnualRevenueUsdM: toNumber(item.estimated_annual_revenue_usd_m) ?? undefined,
        phaseCapexContributionUsdM: toNumber(item.phase_capex_contribution_usd_m) ?? undefined,
        recommendedAction: toString(item.recommended_action),
        rationale: toString(item.rationale),
      };
    })
    .filter((opportunity): opportunity is PrioritizedOpportunity => opportunity !== null)
    .sort((left, right) => left.rank - right.rank);

  if (opportunities.length === 0) return null;

  const phasedRoadmap = toRecord(payload.phased_roadmap);
  const phase1 = toRecord(phasedRoadmap?.phase_1);
  const phase2 = toRecord(phasedRoadmap?.phase_2);
  const phase3 = toRecord(phasedRoadmap?.phase_3);

  return {
    opportunities,
    summary: {
      totalAnchorsRanked: toNumber(payload.total_anchors_ranked) ?? opportunities.length,
      phase1Count: toNumber(phase1?.anchor_count) ?? undefined,
      phase2Count: toNumber(phase2?.anchor_count) ?? undefined,
      phase3Count: toNumber(phase3?.anchor_count) ?? undefined,
    },
  };
}

function parseColocationSummary(payload: UnknownRecord): ColocationSummary | null {
  const rawVariants = Array.isArray(payload.variant_colocation_analysis)
    ? payload.variant_colocation_analysis
    : null;
  if (!rawVariants) return null;

  const comparativeSummary = toRecord(payload.comparative_summary);
  const ranking = Array.isArray(comparativeSummary?.variant_ranking_by_colocation_savings)
    ? comparativeSummary.variant_ranking_by_colocation_savings
    : [];
  const rankingNetCapexByVariant = new Map<string, number>();
  for (const entry of ranking) {
    const item = toRecord(entry);
    if (!item) continue;
    const variantId = toString(item.variant_id);
    const netCapexUsd = toNumber(item.net_capex_usd);
    if (!variantId || netCapexUsd === null) continue;
    rankingNetCapexByVariant.set(variantId, netCapexUsd);
  }

  const variants = rawVariants
    .map((entry): ColocationVariant | null => {
      const item = toRecord(entry);
      if (!item) return null;

      const variantId = toString(item.variant_id);
      const label = toString(item.label);
      if (!variantId || !label) return null;

      return {
        variantId,
        label,
        refinedLengthKm: toNumber(item.refined_length_km) ?? undefined,
        refinedHighwayOverlapPct: toNumber(item.refined_highway_overlap_pct) ?? undefined,
        totalColocationSavingsUsd: toNumber(item.total_colocation_savings_usd) ?? undefined,
        savingsAsPctOfGrossCapex: toNumber(item.savings_as_pct_of_gross_capex) ?? undefined,
        netCapexUsd: rankingNetCapexByVariant.get(variantId),
      };
    })
    .filter((variant): variant is ColocationVariant => variant !== null)
    .sort((left, right) => {
      const leftSavings = left.totalColocationSavingsUsd ?? Number.NEGATIVE_INFINITY;
      const rightSavings = right.totalColocationSavingsUsd ?? Number.NEGATIVE_INFINITY;
      return rightSavings - leftSavings;
    });

  if (variants.length === 0) return null;

  const savingsMethodologyRecord = toRecord(payload.savings_methodology);
  const greenfieldUnitCostsRecord = toRecord(
    savingsMethodologyRecord?.greenfield_unit_costs ??
      savingsMethodologyRecord?.greenfield_costs
  );
  const coLocationUnitCostsRecord = toRecord(
    savingsMethodologyRecord?.co_location_unit_costs ??
      savingsMethodologyRecord?.colocation_unit_costs ??
      savingsMethodologyRecord?.co_located_unit_costs
  );
  const savingsRatePerCategoryRecord = toRecord(
    savingsMethodologyRecord?.savings_rate_per_category ??
      savingsMethodologyRecord?.savings_rates_per_category
  );

  const toNumericRecord = (record: UnknownRecord | null): Record<string, number> | undefined => {
    if (!record) return undefined;
    const entries = Object.entries(record)
      .map(([key, value]) => [key, toNumber(value)] as const)
      .filter((entry): entry is [string, number] => entry[1] !== null);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  };

  const toStringRecord = (record: UnknownRecord | null): Record<string, string> | undefined => {
    if (!record) return undefined;
    const entries = Object.entries(record)
      .map(([key, value]) => [key, toString(value)] as const)
      .filter((entry): entry is [string, string] => entry[1] !== undefined);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  };

  return {
    recommendedVariant: toString(comparativeSummary?.recommended_variant),
    recommendationRationale: toString(comparativeSummary?.recommendation_rationale),
    savingsMethodology: {
      description: toString(savingsMethodologyRecord?.description),
      greenfieldUnitCosts: toNumericRecord(greenfieldUnitCostsRecord),
      coLocationUnitCosts: toNumericRecord(coLocationUnitCostsRecord),
      savingsRatePerCategory: toStringRecord(savingsRatePerCategoryRecord),
    },
    variants,
  };
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
  let nextAnchorLoadsCount = current.anchorLoadsCount;
  let nextCurrentDemand = current.currentDemand;
  let nextBankability = current.bankability;
  let nextGrowthTrajectory = current.growthTrajectory;
  let nextEconomicGaps = current.economicGaps;
  let nextEconomicGapSummary = current.economicGapSummary;
  let nextPrioritizedOpportunities = current.prioritizedOpportunities;
  let nextOpportunitySummary = current.opportunitySummary;
  let nextColocationSummary = current.colocationSummary;

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
    const conflictZones = parseConstraintConflictZones(payload);
    const combined = [...noGoZones, ...conflictZones];
    if (combined.length > 0) {
      nextNoGoZones = combined;
    }
  }

  if (
    toolName === "infrastructure_detection" 
  ) {
    const polygon = parsePolygonCoordinates(payload);
    if (polygon.length > 0) {
      nextPolygon = polygon;
    }
    const infraMetadata = toRecord(payload.job_metadata);
    nextCorridorId =
      toString(payload.corridor_id) ??
      toString(payload.corridorId) ??
      toString(infraMetadata?.corridor_id) ??
      nextCorridorId;

    const detections = parseInfrastructureDetections(payload);
    if (detections.length > 0) {
      nextInfrastructureDetections = detections;
    }
  }

  if (toolName === "route_optimization") {
    const routeVariants = parseRouteVariants(payload);
    if (routeVariants.length > 0) {
      nextRouteVariants = routeVariants;
    }
  }

  if (toolName === "refine_optimized_routes") {
    const refinedVariants = parseRefinedRouteVariants(payload);
    if (refinedVariants.length > 0) {
      nextRouteVariants = refinedVariants;
    }
  }

  if (toolName === "scan_anchor_loads") {
    const anchorPoints = parseAnchorLoadPoints(payload);
    if (anchorPoints.length > 0) {
      nextPoints = anchorPoints;
    }
    nextAnchorLoadsCount =
      toNumber(payload.total_anchors_identified) ?? anchorPoints.length ?? nextAnchorLoadsCount;
  }

  if (toolName === "calculate_current_demand") {
    const currentDemand = parseCurrentDemandAnalysis(payload, nextPoints);
    if (currentDemand) {
      nextCurrentDemand = currentDemand;
    }
  }

  if (toolName === "assess_bankability") {
    const bankability = parseBankabilityAnalysis(payload);
    if (bankability) {
      nextBankability = bankability;
    }
  }

  if (toolName === "model_growth_trajectory") {
    const growthTrajectory = parseGrowthTrajectoryAnalysis(payload);
    if (growthTrajectory) {
      nextGrowthTrajectory = growthTrajectory;
    }
  }

  if (
    toolName === "economic_gap_analysis" ||
    toolName === "analyze_economic_gaps" ||
    toolName === "identify_economic_gaps"
  ) {
    const economicGapAnalysis = parseEconomicGapAnalysis(payload);
    if (economicGapAnalysis) {
      nextEconomicGaps = economicGapAnalysis.gaps;
      nextEconomicGapSummary = economicGapAnalysis.summary;
    }
  }

  if (toolName === "prioritize_opportunities") {
    const opportunityAnalysis = parsePrioritizedOpportunities(payload);
    if (opportunityAnalysis) {
      nextPrioritizedOpportunities = opportunityAnalysis.opportunities;
      nextOpportunitySummary = opportunityAnalysis.summary;
    }
  }

  if (toolName === "quantify_colocation_benefits") {
    const colocationSummary = parseColocationSummary(payload);
    if (colocationSummary) {
      const previous = nextColocationSummary;
      const previousMethodology = previous?.savingsMethodology;
      const incomingMethodology = colocationSummary.savingsMethodology;

      nextColocationSummary = {
        ...colocationSummary,
        recommendedVariant:
          colocationSummary.recommendedVariant ?? previous?.recommendedVariant,
        recommendationRationale:
          colocationSummary.recommendationRationale ?? previous?.recommendationRationale,
        savingsMethodology: {
          description:
            incomingMethodology?.description ?? previousMethodology?.description,
          greenfieldUnitCosts:
            incomingMethodology?.greenfieldUnitCosts ??
            previousMethodology?.greenfieldUnitCosts,
          coLocationUnitCosts:
            incomingMethodology?.coLocationUnitCosts ??
            previousMethodology?.coLocationUnitCosts,
          savingsRatePerCategory:
            incomingMethodology?.savingsRatePerCategory ??
            previousMethodology?.savingsRatePerCategory,
        },
      };
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
    anchorLoadsCount: nextAnchorLoadsCount,
    currentDemand: nextCurrentDemand,
    bankability: nextBankability,
    growthTrajectory: nextGrowthTrajectory,
    economicGaps: nextEconomicGaps,
    economicGapSummary: nextEconomicGapSummary,
    prioritizedOpportunities: nextPrioritizedOpportunities,
    opportunitySummary: nextOpportunitySummary,
    colocationSummary: nextColocationSummary,
  };
}

function finalizeOverlayData(data: MapOverlayData): MapOverlayData | null {
  const hasTerrain =
    Boolean(data.terrainAnalysis?.engineeringRecommendation) ||
    (data.terrainAnalysis?.segmentAnalysis.length ?? 0) > 0;
  const hasNoGoZones = (data.noGoZones?.length ?? 0) > 0;
  const hasInfrastructure = (data.infrastructureDetections?.length ?? 0) > 0;
  const hasRouteVariants = (data.routeVariants?.length ?? 0) > 0;
  const hasAnchorLoads = typeof data.anchorLoadsCount === "number";
  const hasCurrentDemand = Boolean(data.currentDemand);
  const hasBankability = Boolean(data.bankability);
  const hasGrowthTrajectory = Boolean(data.growthTrajectory);
  const hasEconomicGaps = (data.economicGaps?.length ?? 0) > 0;
  const hasPrioritizedOpportunities = (data.prioritizedOpportunities?.length ?? 0) > 0;
  const hasColocationSummary = (data.colocationSummary?.variants.length ?? 0) > 0;
  if (
    data.points.length === 0 &&
    data.polygon.length === 0 &&
    !hasTerrain &&
    !hasNoGoZones &&
    !hasInfrastructure &&
    !hasRouteVariants &&
    !hasAnchorLoads &&
    !hasCurrentDemand &&
    !hasBankability &&
    !hasGrowthTrajectory &&
    !hasEconomicGaps &&
    !hasPrioritizedOpportunities &&
    !hasColocationSummary
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
    anchorLoadsCount: undefined,
    currentDemand: undefined,
    bankability: undefined,
    growthTrajectory: undefined,
    economicGaps: undefined,
    economicGapSummary: undefined,
    prioritizedOpportunities: undefined,
    opportunitySummary: undefined,
    colocationSummary: undefined,
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
    anchorLoadsCount: undefined,
    currentDemand: undefined,
    bankability: undefined,
    growthTrajectory: undefined,
    economicGaps: undefined,
    economicGapSummary: undefined,
    prioritizedOpportunities: undefined,
    opportunitySummary: undefined,
    colocationSummary: undefined,
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
