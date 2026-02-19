"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useSyncExternalStore } from "react";

import { ChatPanel } from "@/components/chat-panel";
import type { MapOverlayData } from "@/lib/map-overlay";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type ChatWorkspaceProps = {
  isSplitView: boolean;
};

const CHAT_SPLIT_SIZES_STORAGE_KEY = "corridor:layout:chat-split-sizes";
const DEFAULT_CHAT_SPLIT_SIZES: [number, number] = [45, 55];
const MIN_CHAT_PANEL_SIZE = 15;
const MIN_MAP_PANEL_SIZE = 25;
const LAYOUT_STORAGE_EVENT = "corridor:layout-storage-change";
let cachedSplitSizesRaw: string | null = null;
let cachedSplitSizesValue: [number, number] = DEFAULT_CHAT_SPLIT_SIZES;

function readStoredSplitSizes(): [number, number] {
  const raw = window.localStorage.getItem(CHAT_SPLIT_SIZES_STORAGE_KEY);
  if (raw === cachedSplitSizesRaw) {
    return cachedSplitSizesValue;
  }
  if (!raw) {
    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = DEFAULT_CHAT_SPLIT_SIZES;
    return cachedSplitSizesValue;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CHAT_SPLIT_SIZES;
      return DEFAULT_CHAT_SPLIT_SIZES;
    }

    const left = Number(parsed[0]);
    const right = Number(parsed[1]);
    if (
      !Number.isFinite(left) ||
      !Number.isFinite(right) ||
      left < 10 ||
      right < 10
    ) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CHAT_SPLIT_SIZES;
      return DEFAULT_CHAT_SPLIT_SIZES;
    }

    const total = left + right;
    if (total <= 0) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CHAT_SPLIT_SIZES;
      return DEFAULT_CHAT_SPLIT_SIZES;
    }

    let normalizedLeft = (left / total) * 100;
    let normalizedRight = (right / total) * 100;

    if (normalizedLeft < MIN_CHAT_PANEL_SIZE) {
      normalizedLeft = MIN_CHAT_PANEL_SIZE;
      normalizedRight = 100 - MIN_CHAT_PANEL_SIZE;
    }
    if (normalizedRight < MIN_MAP_PANEL_SIZE) {
      normalizedRight = MIN_MAP_PANEL_SIZE;
      normalizedLeft = 100 - MIN_MAP_PANEL_SIZE;
    }

    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = [normalizedLeft, normalizedRight];
    return cachedSplitSizesValue;
  } catch {
    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = DEFAULT_CHAT_SPLIT_SIZES;
    return DEFAULT_CHAT_SPLIT_SIZES;
  }
}

function subscribeLayoutStorage(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(LAYOUT_STORAGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(LAYOUT_STORAGE_EVENT, handleChange);
  };
}

function isSameMapData(
  a: MapOverlayData | null,
  b: MapOverlayData | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.corridorId !== b.corridorId) return false;
  if (a.points.length !== b.points.length) return false;
  if (a.polygon.length !== b.polygon.length) return false;

  for (let index = 0; index < a.points.length; index += 1) {
    const left = a.points[index];
    const right = b.points[index];
    if (
      left.label !== right.label ||
      left.latitude !== right.latitude ||
      left.longitude !== right.longitude ||
      left.confidence !== right.confidence ||
      left.anchorId !== right.anchorId ||
      left.detectionId !== right.detectionId ||
      left.sector !== right.sector ||
      left.subSector !== right.subSector ||
      left.country !== right.country ||
      left.operator !== right.operator ||
      left.registrySource !== right.registrySource ||
      left.identityConfidence !== right.identityConfidence ||
      left.resolutionNote !== right.resolutionNote
    ) {
      return false;
    }
  }

  for (let index = 0; index < a.polygon.length; index += 1) {
    const [leftLat, leftLng] = a.polygon[index];
    const [rightLat, rightLng] = b.polygon[index];
    if (leftLat !== rightLat || leftLng !== rightLng) {
      return false;
    }
  }

  const leftTerrain = a.terrainAnalysis;
  const rightTerrain = b.terrainAnalysis;
  if (Boolean(leftTerrain) !== Boolean(rightTerrain)) return false;
  if (leftTerrain && rightTerrain) {
    if (
      leftTerrain.totalExcavationEstimateM3 !== rightTerrain.totalExcavationEstimateM3 ||
      leftTerrain.engineeringRecommendation !== rightTerrain.engineeringRecommendation
    ) {
      return false;
    }
    if (leftTerrain.segmentAnalysis.length !== rightTerrain.segmentAnalysis.length) {
      return false;
    }
    for (let index = 0; index < leftTerrain.segmentAnalysis.length; index += 1) {
      const left = leftTerrain.segmentAnalysis[index];
      const right = rightTerrain.segmentAnalysis[index];
      if (
        left.segmentId !== right.segmentId ||
        left.label !== right.label ||
        left.country !== right.country ||
        left.startKm !== right.startKm ||
        left.endKm !== right.endKm ||
        left.startCoordinate?.latitude !== right.startCoordinate?.latitude ||
        left.startCoordinate?.longitude !== right.startCoordinate?.longitude ||
        left.endCoordinate?.latitude !== right.endCoordinate?.latitude ||
        left.endCoordinate?.longitude !== right.endCoordinate?.longitude ||
        left.avgSlope !== right.avgSlope ||
        left.soilStability !== right.soilStability ||
        left.floodRisk !== right.floodRisk ||
        left.difficultyScore !== right.difficultyScore
      ) {
        return false;
      }
    }
  }

  if ((a.noGoZones?.length ?? 0) !== (b.noGoZones?.length ?? 0)) return false;
  for (let index = 0; index < (a.noGoZones?.length ?? 0); index += 1) {
    const left = a.noGoZones?.[index];
    const right = b.noGoZones?.[index];
    if (!left || !right) return false;
    if (
      left.zoneId !== right.zoneId ||
      left.description !== right.description ||
      left.latitude !== right.latitude ||
      left.longitude !== right.longitude ||
      left.radiusKm !== right.radiusKm ||
      left.reason !== right.reason ||
      left.severity !== right.severity
    ) {
      return false;
    }

    if ((left.polygon?.length ?? 0) !== (right.polygon?.length ?? 0)) return false;
    for (let pointIndex = 0; pointIndex < (left.polygon?.length ?? 0); pointIndex += 1) {
      const leftPoint = left.polygon?.[pointIndex];
      const rightPoint = right.polygon?.[pointIndex];
      if (!leftPoint || !rightPoint) return false;
      if (leftPoint[0] !== rightPoint[0] || leftPoint[1] !== rightPoint[1]) return false;
    }
  }

  if ((a.infrastructureDetections?.length ?? 0) !== (b.infrastructureDetections?.length ?? 0)) {
    return false;
  }
  for (let index = 0; index < (a.infrastructureDetections?.length ?? 0); index += 1) {
    const left = a.infrastructureDetections?.[index];
    const right = b.infrastructureDetections?.[index];
    if (!left || !right) return false;
    if (
      left.detectionId !== right.detectionId ||
      left.type !== right.type ||
      left.subtype !== right.subtype ||
      left.label !== right.label ||
      left.latitude !== right.latitude ||
      left.longitude !== right.longitude ||
      left.confidence !== right.confidence ||
      left.verificationStatus !== right.verificationStatus ||
      left.isAnchorLoad !== right.isAnchorLoad ||
      left.isGenerationAsset !== right.isGenerationAsset ||
      left.gridInterconnectionPriority !== right.gridInterconnectionPriority ||
      left.estimatedPowerDemandMw !== right.estimatedPowerDemandMw ||
      left.estimatedGenerationCapacityMw !== right.estimatedGenerationCapacityMw ||
      left.bbox?.topLeft.latitude !== right.bbox?.topLeft.latitude ||
      left.bbox?.topLeft.longitude !== right.bbox?.topLeft.longitude ||
      left.bbox?.bottomRight.latitude !== right.bbox?.bottomRight.latitude ||
      left.bbox?.bottomRight.longitude !== right.bbox?.bottomRight.longitude
    ) {
      return false;
    }
  }

  if ((a.routeVariants?.length ?? 0) !== (b.routeVariants?.length ?? 0)) {
    return false;
  }
  for (let index = 0; index < (a.routeVariants?.length ?? 0); index += 1) {
    const left = a.routeVariants?.[index];
    const right = b.routeVariants?.[index];
    if (!left || !right) return false;
    if (
      left.variantId !== right.variantId ||
      left.label !== right.label ||
      left.rank !== right.rank ||
      left.isRecommended !== right.isRecommended ||
      left.distanceKm !== right.distanceKm ||
      left.estimatedCostUsd !== right.estimatedCostUsd ||
      left.estimatedDurationHours !== right.estimatedDurationHours
    ) {
      return false;
    }

    if (left.route.length !== right.route.length) return false;
    for (let pointIndex = 0; pointIndex < left.route.length; pointIndex += 1) {
      const [leftLat, leftLng] = left.route[pointIndex];
      const [rightLat, rightLng] = right.route[pointIndex];
      if (leftLat !== rightLat || leftLng !== rightLng) return false;
    }
  }

  if (a.anchorLoadsCount !== b.anchorLoadsCount) return false;
  if (Boolean(a.currentDemand) !== Boolean(b.currentDemand)) return false;
  if (a.currentDemand && b.currentDemand) {
    if (a.currentDemand.totalCurrentMw !== b.currentDemand.totalCurrentMw) return false;
    if (a.currentDemand.demandProfiles.length !== b.currentDemand.demandProfiles.length) {
      return false;
    }
    for (let index = 0; index < a.currentDemand.demandProfiles.length; index += 1) {
      const left = a.currentDemand.demandProfiles[index];
      const right = b.currentDemand.demandProfiles[index];
      if (
        left.anchorId !== right.anchorId ||
        left.detectionId !== right.detectionId ||
        left.name !== right.name ||
        left.country !== right.country ||
        left.sector !== right.sector ||
        left.subSector !== right.subSector ||
        left.currentMw !== right.currentMw ||
        left.loadFactor !== right.loadFactor ||
        left.reliabilityClass !== right.reliabilityClass ||
        left.reliabilityRationale !== right.reliabilityRationale ||
        left.demandBasis !== right.demandBasis
      ) {
        return false;
      }
    }
  }
  if (Boolean(a.bankability) !== Boolean(b.bankability)) return false;
  if (a.bankability && b.bankability) {
    if (
      a.bankability.corridorAverageScore !== b.bankability.corridorAverageScore ||
      a.bankability.anchorLoadsAssessed !== b.bankability.anchorLoadsAssessed ||
      a.bankability.tier1Count !== b.bankability.tier1Count ||
      a.bankability.tier2Count !== b.bankability.tier2Count ||
      a.bankability.tier3Count !== b.bankability.tier3Count
    ) {
      return false;
    }
    if (a.bankability.profiles.length !== b.bankability.profiles.length) return false;
    for (let index = 0; index < a.bankability.profiles.length; index += 1) {
      const left = a.bankability.profiles[index];
      const right = b.bankability.profiles[index];
      if (
        left.anchorId !== right.anchorId ||
        left.detectionId !== right.detectionId ||
        left.name !== right.name ||
        left.country !== right.country ||
        left.score !== right.score ||
        left.tier !== right.tier ||
        left.offtakeWillingness !== right.offtakeWillingness ||
        left.financialStrength !== right.financialStrength ||
        left.contractReadiness !== right.contractReadiness ||
        left.rationale !== right.rationale ||
        left.creditEnhancementRequired !== right.creditEnhancementRequired
      ) {
        return false;
      }
    }
  }
  if (Boolean(a.growthTrajectory) !== Boolean(b.growthTrajectory)) return false;
  if (a.growthTrajectory && b.growthTrajectory) {
    if (
      a.growthTrajectory.projectionSummary !== b.growthTrajectory.projectionSummary ||
      a.growthTrajectory.aggregateCurrentMw !== b.growthTrajectory.aggregateCurrentMw ||
      a.growthTrajectory.aggregateYear5Mw !== b.growthTrajectory.aggregateYear5Mw ||
      a.growthTrajectory.aggregateYear10Mw !== b.growthTrajectory.aggregateYear10Mw ||
      a.growthTrajectory.aggregateYear20Mw !== b.growthTrajectory.aggregateYear20Mw ||
      a.growthTrajectory.aggregateGrowthPct !== b.growthTrajectory.aggregateGrowthPct
    ) {
      return false;
    }
    if (a.growthTrajectory.profiles.length !== b.growthTrajectory.profiles.length) return false;
    for (let index = 0; index < a.growthTrajectory.profiles.length; index += 1) {
      const left = a.growthTrajectory.profiles[index];
      const right = b.growthTrajectory.profiles[index];
      if (
        left.anchorId !== right.anchorId ||
        left.detectionId !== right.detectionId ||
        left.name !== right.name ||
        left.country !== right.country ||
        left.bankabilityTier !== right.bankabilityTier ||
        left.currentMw !== right.currentMw ||
        left.year5Mw !== right.year5Mw ||
        left.year10Mw !== right.year10Mw ||
        left.year20Mw !== right.year20Mw ||
        left.cagr !== right.cagr ||
        left.growthDriverType !== right.growthDriverType ||
        left.growthDriver !== right.growthDriver ||
        left.confidenceBand !== right.confidenceBand
      ) {
        return false;
      }
    }
  }

  return true;
}

const MapPanel = dynamic(
  () => import("@/components/map-panel").then((mod) => mod.MapPanel),
  { ssr: false }
);

export function ChatWorkspace({ isSplitView }: ChatWorkspaceProps) {
  const [mapData, setMapData] = useState<MapOverlayData | null>(null);
  const splitSizes = useSyncExternalStore(
    subscribeLayoutStorage,
    readStoredSplitSizes,
    () => DEFAULT_CHAT_SPLIT_SIZES
  );
  const handleMapDataChange = useCallback((data: MapOverlayData | null) => {
    setMapData((previous) => (isSameMapData(previous, data) ? previous : data));
  }, []);
  const handleLayoutChange = useCallback((sizes: number[]) => {
    if (sizes.length !== 2) return;

    const left = sizes[0];
    const right = sizes[1];
    if (!Number.isFinite(left) || !Number.isFinite(right)) return;

    window.localStorage.setItem(
      CHAT_SPLIT_SIZES_STORAGE_KEY,
      JSON.stringify([left, right])
    );
    window.dispatchEvent(new Event(LAYOUT_STORAGE_EVENT));
  }, []);

  if (!isSplitView) {
    return <ChatPanel withBottomSpacing />;
  }

  const [chatPanelSize, mapPanelSize] = splitSizes;

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-full w-full overflow-hidden"
      onLayout={handleLayoutChange}
    >
      <ResizablePanel
        defaultSize={`${chatPanelSize}%`}
        minSize={MIN_CHAT_PANEL_SIZE}
        className="h-full"
      >
        <div className="h-full w-full px-4 py-3">
          <ChatPanel onMapDataChange={handleMapDataChange} />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel
        defaultSize={`${mapPanelSize}%`}
        minSize={MIN_MAP_PANEL_SIZE}
        className="h-full"
      >
        <MapPanel data={mapData} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
