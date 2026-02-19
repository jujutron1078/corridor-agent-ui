import type { MapOverlayData } from "@/lib/map-overlay";

export type GeneratedArtifact = {
  id: string;
  title: string;
  body: string;
};

export type CanvasDocument = {
  id: string;
  title: string;
  content: string;
  isJson?: boolean;
};

export const EXAMPLE_CANVAS_DOCUMENTS: CanvasDocument[] = [
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

export function buildGeneratedArtifacts(data: MapOverlayData | null): GeneratedArtifact[] {
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

export function artifactToCanvasDocument(artifact: GeneratedArtifact): CanvasDocument {
  return {
    id: `artifact-${artifact.id}`,
    title: artifact.title,
    content: artifact.body,
    isJson: true,
  };
}
