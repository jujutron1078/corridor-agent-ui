"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Clock3 } from "lucide-react";

import { parseToolResult, cn } from "@/lib/utils";
import type { ToolCardProps } from "@/components/tool-calls/types";

const TOOL_NAME_LABELS: Record<string, string> = {
  // Geospatial Intelligence
  geocode_location: "Geocoding Location",
  define_corridor: "Defining Corridor",
  fetch_geospatial_layers: "Fetching Geospatial Layers",
  terrain_analysis: "Analyzing Terrain",
  environmental_constraints: "Checking Environmental Constraints",
  infrastructure_detection: "Detecting Infrastructure",
  route_optimization: "Optimizing Route",
  // Opportunity Identification
  scan_anchor_loads: "Scanning Anchor Loads",
  calculate_current_demand: "Calculating Current Demand",
  assess_bankability: "Assessing Bankability",
  model_growth_trajectory: "Modeling Growth Trajectory",
  economic_gap_analysis: "Analyzing Economic Gaps",
  analyze_economic_gaps: "Analyzing Economic Gaps",
  identify_economic_gaps: "Identifying Economic Gaps",
  prioritize_opportunities: "Prioritizing Opportunities",
  // Infrastructure Optimization
  refine_optimized_routes: "Refining Route Variants",
  quantify_colocation_benefits: "Quantifying Co-location Benefits",
  size_voltage_and_capacity: "Sizing Voltage & Capacity",
  optimize_substation_placement: "Optimizing Substation Placement",
  generate_phasing_strategy: "Generating Phasing Strategy",
  generate_cost_estimates: "Generating Cost Estimates",
  // Economic Impact Modeling
  calculate_gdp_multipliers: "Calculating GDP Multipliers",
  model_employment_impact: "Modeling Employment Impact",
  assess_poverty_reduction: "Assessing Poverty Reduction",
  quantify_catalytic_effects: "Quantifying Catalytic Effects",
  model_regional_integration: "Modeling Regional Integration",
  perform_impact_scenario_analysis: "Running Impact Scenarios",
  // Financing Optimization
  match_dfi_institutions: "Matching DFI Institutions",
  generate_financing_scenarios: "Generating Financing Scenarios",
  build_financial_model: "Building Financial Model",
  optimize_debt_terms: "Optimizing Debt Terms",
  model_credit_enhancement: "Modeling Credit Enhancement",
  perform_risk_and_sensitivity_analysis: "Running Risk & Sensitivity Analysis",
  // Stakeholder Intelligence
  map_stakeholder_ecosystem: "Mapping Stakeholder Ecosystem",
  analyze_influence_networks: "Analyzing Influence Networks",
  assess_stakeholder_risks: "Assessing Stakeholder Risks",
  generate_engagement_roadmap: "Generating Engagement Roadmap",
  generate_tailored_messaging: "Generating Tailored Messaging",
  track_engagement_sentiment: "Tracking Engagement Sentiment",
  // Orchestrator
  think_tool: "Thinking",
  write_todos: "Planning Tasks",
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
