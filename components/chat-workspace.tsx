"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";

import { ChatPanel } from "@/components/chat-panel";
import { SiteHeader } from "@/components/site-header";
import type { MapOverlayData } from "@/lib/map-overlay";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type ChatWorkspaceProps = {
  isMapCanvasOpen: boolean;
  onToggleMapCanvas: () => void;
};

const CANVAS_SPLIT_SIZES_STORAGE_KEY = "corridor:layout:canvas-split-sizes";
const CANVAS_RIGHT_PANEL_TAB_STORAGE_KEY = "corridor:canvas:right-panel-tab";
const CANVAS_ACTIVE_DOCUMENT_STORAGE_KEY = "corridor:canvas:active-document-id";
const DEFAULT_CANVAS_SPLIT_SIZES: [number, number] = [55, 45];
const MIN_CHAT_PANEL_SIZE = 15;
const MIN_CANVAS_PANEL_SIZE = 25;
const LAYOUT_STORAGE_EVENT = "corridor:layout-storage-change";
let cachedSplitSizesRaw: string | null = null;
let cachedSplitSizesValue: [number, number] = DEFAULT_CANVAS_SPLIT_SIZES;

function readStoredSplitSizes(): [number, number] {
  const raw = window.localStorage.getItem(CANVAS_SPLIT_SIZES_STORAGE_KEY);
  if (raw === cachedSplitSizesRaw) return cachedSplitSizesValue;
  if (!raw) {
    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
    return cachedSplitSizesValue;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
      return DEFAULT_CANVAS_SPLIT_SIZES;
    }

    const left = Number(parsed[0]);
    const right = Number(parsed[1]);
    if (!Number.isFinite(left) || !Number.isFinite(right) || left < 10 || right < 10) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
      return DEFAULT_CANVAS_SPLIT_SIZES;
    }

    const total = left + right;
    if (total <= 0) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
      return DEFAULT_CANVAS_SPLIT_SIZES;
    }

    let normalizedLeft = (left / total) * 100;
    let normalizedRight = (right / total) * 100;
    if (normalizedLeft < MIN_CHAT_PANEL_SIZE) {
      normalizedLeft = MIN_CHAT_PANEL_SIZE;
      normalizedRight = 100 - MIN_CHAT_PANEL_SIZE;
    }
    if (normalizedRight < MIN_CANVAS_PANEL_SIZE) {
      normalizedRight = MIN_CANVAS_PANEL_SIZE;
      normalizedLeft = 100 - MIN_CANVAS_PANEL_SIZE;
    }

    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = [normalizedLeft, normalizedRight];
    return cachedSplitSizesValue;
  } catch {
    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
    return DEFAULT_CANVAS_SPLIT_SIZES;
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

type GeneratedArtifact = {
  id: string;
  title: string;
  body: string;
};

type CanvasDocument = {
  id: string;
  title: string;
  content: string;
  isJson?: boolean;
};

const EXAMPLE_CANVAS_DOCUMENTS: CanvasDocument[] = [
  {
    id: "example-exec-report",
    title: "Executive Summary Report",
    content: `Project: East Africa Backbone Corridor\nStatus: Draft\n\nSummary\nThe corridor is viable with strong industrial demand concentration near Nairobi and Kampala. Current opportunity is to prioritize a first deployment phase that links known anchor loads before extending to secondary growth clusters.\n\nKey Highlights\n- 3 primary demand anchors identified\n- Recommended initial route avoids high-risk flood sections\n- Estimated phase-one demand capture: 142 MW\n\nImmediate Actions\n1. Validate right-of-way assumptions with field survey team\n2. Initiate anchor commercial outreach for top-tier offtakers\n3. Run bankability scoring refresh once updated anchor financials are received`,
  },
  {
    id: "example-risk-note",
    title: "Risk & Mitigation Note",
    content: `Document Purpose\nCapture the current risk posture for the proposed corridor and define mitigation actions for the next planning cycle.\n\nTop Risks\n- Terrain complexity in segment S2 may increase civil costs\n- Unverified generation assumptions around two industrial clusters\n- Delayed permitting window in one cross-border section\n\nMitigation Plan\n- Commission high-resolution terrain survey for S2 before EPC scoping\n- Add confidence scoring to all generation assumptions in next model run\n- Start permit pre-consultations in parallel with route variant review\n\nDecision Gate\nAdvance to commercial packaging only if revised route cost delta stays within 12% of base model.`,
  },
];

function buildGeneratedArtifacts(data: MapOverlayData | null): GeneratedArtifact[] {
  if (!data) return [];

  const artifacts: GeneratedArtifact[] = [];

  if (data.corridorId || data.polygon.length > 0) {
    artifacts.push({
      id: "corridor-definition",
      title: "Corridor Definition",
      body: JSON.stringify(
        {
          corridorId: data.corridorId ?? null,
          polygonPoints: data.polygon.length,
          polygon: data.polygon,
        },
        null,
        2
      ),
    });
  }

  if ((data.infrastructureDetections?.length ?? 0) > 0) {
    artifacts.push({
      id: "infrastructure-detections",
      title: "Infrastructure Detections",
      body: JSON.stringify(data.infrastructureDetections, null, 2),
    });
  }

  if ((data.routeVariants?.length ?? 0) > 0) {
    artifacts.push({
      id: "route-variants",
      title: "Route Variants",
      body: JSON.stringify(data.routeVariants, null, 2),
    });
  }

  if ((data.economicGaps?.length ?? 0) > 0) {
    artifacts.push({
      id: "economic-gaps",
      title: "Economic Gaps",
      body: JSON.stringify(
        {
          summary: data.economicGapSummary ?? null,
          gaps: data.economicGaps,
        },
        null,
        2
      ),
    });
  }

  if ((data.prioritizedOpportunities?.length ?? 0) > 0) {
    artifacts.push({
      id: "prioritized-opportunities",
      title: "Prioritized Opportunities",
      body: JSON.stringify(
        {
          summary: data.opportunitySummary ?? null,
          opportunities: data.prioritizedOpportunities,
        },
        null,
        2
      ),
    });
  }

  return artifacts;
}

function artifactToCanvasDocument(artifact: GeneratedArtifact): CanvasDocument {
  return {
    id: `artifact-${artifact.id}`,
    title: artifact.title,
    content: artifact.body,
    isJson: true,
  };
}

export function ChatWorkspace({
  isMapCanvasOpen,
  onToggleMapCanvas,
}: ChatWorkspaceProps) {
  const [mapData, setMapData] = useState<MapOverlayData | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"map" | "artifacts">("map");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(EXAMPLE_CANVAS_DOCUMENTS[0].id);
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, string>>({});
  const [hiddenDocumentIds, setHiddenDocumentIds] = useState<string[]>([]);
  const splitSizes = useSyncExternalStore(
    subscribeLayoutStorage,
    readStoredSplitSizes,
    () => DEFAULT_CANVAS_SPLIT_SIZES
  );
  const handleMapDataChange = useCallback((data: MapOverlayData | null) => {
    setMapData((previous) => (isSameMapData(previous, data) ? previous : data));
  }, []);
  const handleLayoutChange = useCallback((sizes: number[]) => {
    if (sizes.length !== 2) return;

    const left = sizes[0];
    const right = sizes[1];
    if (!Number.isFinite(left) || !Number.isFinite(right)) return;

    window.localStorage.setItem(CANVAS_SPLIT_SIZES_STORAGE_KEY, JSON.stringify([left, right]));
    window.dispatchEvent(new Event(LAYOUT_STORAGE_EVENT));
  }, []);
  const artifacts = buildGeneratedArtifacts(mapData);
  const allDocuments = useMemo(() => {
    const generatedDocs = artifacts.map(artifactToCanvasDocument);
    return [...EXAMPLE_CANVAS_DOCUMENTS, ...generatedDocs];
  }, [artifacts]);
  const documents = useMemo(
    () => allDocuments.filter((document) => !hiddenDocumentIds.includes(document.id)),
    [allDocuments, hiddenDocumentIds]
  );
  useEffect(() => {
    const storedRightPanelTab = window.localStorage.getItem(CANVAS_RIGHT_PANEL_TAB_STORAGE_KEY);
    if (storedRightPanelTab === "map" || storedRightPanelTab === "artifacts") {
      setRightPanelTab(storedRightPanelTab);
    }

    const storedDocumentId = window.localStorage.getItem(CANVAS_ACTIVE_DOCUMENT_STORAGE_KEY);
    if (storedDocumentId) {
      setSelectedDocumentId(storedDocumentId);
    }
  }, []);
  useEffect(() => {
    window.localStorage.setItem(CANVAS_RIGHT_PANEL_TAB_STORAGE_KEY, rightPanelTab);
  }, [rightPanelTab]);
  useEffect(() => {
    if (selectedDocumentId) {
      window.localStorage.setItem(CANVAS_ACTIVE_DOCUMENT_STORAGE_KEY, selectedDocumentId);
      return;
    }

    window.localStorage.removeItem(CANVAS_ACTIVE_DOCUMENT_STORAGE_KEY);
  }, [selectedDocumentId]);
  useEffect(() => {
    if (documents.length === 0) {
      if (selectedDocumentId !== "") {
        setSelectedDocumentId("");
      }
      return;
    }

    const selectedExists = documents.some((document) => document.id === selectedDocumentId);
    if (!selectedExists) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId]);
  const activeDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null;
  const activeDocumentId = activeDocument?.id ?? "";
  const activeDocumentContent = activeDocumentId
    ? (documentDrafts[activeDocumentId] ?? activeDocument?.content ?? "")
    : "";
  const [chatPanelSize, canvasPanelSize] = splitSizes;

  if (!isMapCanvasOpen) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <SiteHeader onMapClick={onToggleMapCanvas} />
        <div className="min-h-0 flex-1 px-4 py-3">
          <ChatPanel withBottomSpacing onMapDataChange={handleMapDataChange} />
        </div>
      </div>
    );
  }

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
        <div className="flex h-full min-h-0 w-full flex-col">
          <SiteHeader onMapClick={onToggleMapCanvas} />
          <div className="min-h-0 flex-1 px-4 py-3">
            <ChatPanel withBottomSpacing onMapDataChange={handleMapDataChange} />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel
        defaultSize={`${canvasPanelSize}%`}
        minSize={MIN_CANVAS_PANEL_SIZE}
        className="h-full"
      >
        <div className="flex h-full min-h-0 flex-col">
          {rightPanelTab === "artifacts" ? (
            <div className="h-(--header-height) shrink-0 border-b bg-background">
              <div className="flex h-full items-end gap-0 overflow-x-auto px-2 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {documents.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    className={`relative -mb-px -mr-px flex max-w-[240px] items-center gap-1 rounded-t-[11px] border px-3 py-1.5 text-sm transition-all ${
                      activeDocument?.id === document.id
                        ? "z-10 border-border border-b-transparent bg-background text-foreground"
                        : "z-0 border-transparent bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSelectedDocumentId(document.id)}
                  >
                    <span className="truncate">{document.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Close ${document.title}`}
                      className="ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        setHiddenDocumentIds((previous) =>
                          previous.includes(document.id) ? previous : [...previous, document.id]
                        );
                        if (selectedDocumentId === document.id) {
                          const remaining = documents.filter((item) => item.id !== document.id);
                          setSelectedDocumentId(remaining[0]?.id ?? "");
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        setHiddenDocumentIds((previous) =>
                          previous.includes(document.id) ? previous : [...previous, document.id]
                        );
                        if (selectedDocumentId === document.id) {
                          const remaining = documents.filter((item) => item.id !== document.id);
                          setSelectedDocumentId(remaining[0]?.id ?? "");
                        }
                      }}
                    >
                      <X className="size-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {rightPanelTab === "map" ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <MapPanel data={mapData} />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/10">
              <div className="min-h-0 flex-1 overflow-y-auto px-4">
                {activeDocument ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <p className="py-2 text-xs font-medium text-muted-foreground">
                      {activeDocument.title}
                    </p>
                    <textarea
                      value={activeDocumentContent}
                      onChange={(event) => {
                        if (!activeDocumentId) return;
                        setDocumentDrafts((previous) => ({
                          ...previous,
                          [activeDocumentId]: event.target.value,
                        }));
                      }}
                      className={`min-h-0 flex-1 resize-none bg-transparent outline-none ${
                        activeDocument.isJson
                          ? "font-mono text-xs leading-5 text-foreground/85"
                          : "text-sm leading-6 text-foreground/90"
                      }`}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                    No document selected.
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="sticky bottom-0 z-10 mt-auto grid h-10 w-full grid-cols-2 divide-x divide-border border-t border-border bg-background">
            <button
              type="button"
              className={`h-full w-full text-sm font-medium ${
                rightPanelTab === "map" ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setRightPanelTab("map")}
            >
              Map Canvas
            </button>
            <button
              type="button"
              className={`h-full w-full text-sm font-medium ${
                rightPanelTab === "artifacts" ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setRightPanelTab("artifacts")}
            >
              Artifact Canvas
            </button>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
