import type { MapOverlayData } from "@/lib/map-overlay";

export type GeneratedArtifact = {
  id: string;
  title: string;
  body: string;
  table?: {
    columns: string[];
    rows: string[][];
  };
};

export type CanvasDocument = {
  id: string;
  title: string;
  content: string;
  isJson?: boolean;
  table?: {
    columns: string[];
    rows: string[][];
  };
};

function formatUsdCompact(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number | undefined, digits = 1): string {
  if (value === undefined || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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

  if ((data.colocationSummary?.variants.length ?? 0) > 0) {
    const colocationVariants = data.colocationSummary?.variants ?? [];
    const recommendedVariant = data.colocationSummary?.recommendedVariant ?? "N/A";
    const recommendationRationale =
      data.colocationSummary?.recommendationRationale ?? "No recommendation rationale provided.";
    const methodologyDescription =
      data.colocationSummary?.savingsMethodology?.description ?? "No methodology description provided.";
    const greenfieldUnitCosts = data.colocationSummary?.savingsMethodology?.greenfieldUnitCosts ?? {};
    const coLocationUnitCosts = data.colocationSummary?.savingsMethodology?.coLocationUnitCosts ?? {};
    const savingsRates = data.colocationSummary?.savingsMethodology?.savingsRatePerCategory ?? {};

    const greenfieldLines = Object.entries(greenfieldUnitCosts).map(
      ([key, value]) => `- ${formatLabel(key)}: ${formatUsdCompact(value)}`
    );
    const coLocatedLines = Object.entries(coLocationUnitCosts).map(
      ([key, value]) => `- ${formatLabel(key)}: ${formatUsdCompact(value)}`
    );
    const savingsRateLines = Object.entries(savingsRates).map(
      ([key, value]) => `- ${formatLabel(key)}: ${value}`
    );

    artifacts.push({
      id: "colocation-benefits",
      title: "Co-location Benefits",
      body: [
        `Recommended Variant: ${recommendedVariant}`,
        ``,
        `Rationale: ${recommendationRationale}`,
        ``,
        `Savings Methodology`,
        `${methodologyDescription}`,
        ``,
        `Greenfield Unit Costs`,
        ...(greenfieldLines.length > 0 ? greenfieldLines : ["- No unit costs provided."]),
        ``,
        `Co-located Unit Costs`,
        ...(coLocatedLines.length > 0 ? coLocatedLines : ["- No unit costs provided."]),
        ``,
        `Savings Rate Per Category`,
        ...(savingsRateLines.length > 0 ? savingsRateLines : ["- No category savings rates provided."]),
      ].join("\n"),
      table: {
        columns: [
          "Variant",
          "Length (km)",
          "Overlap (%)",
          "Savings (USD)",
          "Savings (% CAPEX)",
          "Net CAPEX (USD)",
        ],
        rows: colocationVariants.map((variant) => [
          variant.variantId,
          formatNumber(variant.refinedLengthKm),
          formatNumber(variant.refinedHighwayOverlapPct),
          formatUsdCompact(variant.totalColocationSavingsUsd),
          variant.savingsAsPctOfGrossCapex !== undefined
            ? `${formatNumber(variant.savingsAsPctOfGrossCapex)}%`
            : "-",
          formatUsdCompact(variant.netCapexUsd),
        ]),
      },
    });
  }

  return artifacts;
}

export function artifactToCanvasDocument(artifact: GeneratedArtifact): CanvasDocument {
  return {
    id: `artifact-${artifact.id}`,
    title: artifact.title,
    content: artifact.body,
    isJson: artifact.table ? false : true,
    table: artifact.table,
  };
}
