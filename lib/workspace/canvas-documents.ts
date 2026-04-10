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
    id: "corridor-overview",
    title: "Corridor Overview",
    content: `Lagos-Abidjan Economic Corridor\nLength: 1,028 km | Countries: 5 (NGA, BEN, TGO, GHA, CIV)\n\nUse the AI Agents to query live corridor data:\n- "What is Nigeria's GDP?" → Economic indicators\n- "Show me cocoa trade flows" → Trade analysis\n- "How many infrastructure projects?" → Project pipeline\n- "Compare investment policies" → Policy analysis\n\nData artifacts from agent queries will appear here as tabs.`,
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
