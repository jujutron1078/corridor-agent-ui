"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Clock3 } from "lucide-react";

import { parseToolResult, cn } from "@/lib/utils";
import type { ToolCardProps } from "@/components/tool-calls/types";

const TOOL_NAME_LABELS: Record<string, string> = {
  geocode_location: "Defining Geocode Location",
  define_corridor: "Defining Corridor",
  fetch_geospatial_layers: "Fetching Geospatial Layers",
  terrain_analysis: "Analyzing Terrain",
  environmental_constraints: "Checking Environmental Constraints",
  infrastructure_detection: "Detecting Infrastructure",
  route_optimization: "Optimizing Route",
  scan_anchor_loads: "Scanning Anchor Loads",
  calculate_current_demand: "Calculating Current Demand",
  assess_bankability: "Assessing Bankability",
  model_growth_trajectory: "Modeling Growth Trajectory",
  economic_gap_analysis: "Analyzing Economic Gaps",
  analyze_economic_gaps: "Analyzing Economic Gaps",
  identify_economic_gaps: "Identifying Economic Gaps",
  prioritize_opportunities: "Prioritizing Opportunities",
  get_weather: "Getting Weather",
};

function formatToolName(name: string): string {
  const mapped = TOOL_NAME_LABELS[name];
  if (mapped) return mapped;

  const readableName = name
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());

  return `Running ${readableName}`;
}

export function GenericToolCallCard({ toolCall }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { call, result, state } = toolCall;

  const isLoading = state === "pending";
  const parsedResult = parseToolResult(result);

  return (
    <div className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          "flex w-full items-center gap-2 px-1 py-1 text-left",
          "transition-colors hover:bg-muted/60"
        )}
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{formatToolName(call.name)}</span>
        <span className="ml-auto text-muted-foreground" aria-label={isLoading ? "Running" : "Completed"}>
          {isLoading ? <Clock3 className="size-4" /> : <Check className="size-4" />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 px-1 pb-1">
          <pre className="overflow-x-auto bg-background/60 p-2 text-xs">
            {JSON.stringify(call.args, null, 2)}
          </pre>
          {result && (
            <div className="bg-background/60 p-2 text-sm">
              {parsedResult.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
