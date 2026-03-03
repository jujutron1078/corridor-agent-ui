"use client";

import { useState, type ComponentType } from "react";
import {
  Activity,
  BarChart3,
  HandCoins,
  Map,
  Pickaxe,
  TrendingUp,
  Users2,
  X,
} from "lucide-react";
import { ChatComposer } from "@/components/chat-composer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatEmptyStateProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isLoading: boolean;
  maxChars?: number;
  error?: unknown;
};

type StarterPromptChip = {
  group: string;
  title: string;
  prompt: string;
  icon?: string;
  order: number;
};

const STARTER_PROMPT_CHIPS: StarterPromptChip[] = [
  {
    group: "Geospatial",
    title: "Generate Route Options",
    prompt:
      "Generate optimized route options for Abidjan to Lagos using priority balance. Include all terrain metrics with a 50 km sampling interval, all environmental constraints with a 500 m buffer, and detect all anchor infrastructure types along the corridor. Return top 5 routes with length, CAPEX signal, constraints, and recommendation.",
    icon: "geospatial",
    order: 1,
  },
  {
    group: "Geospatial",
    title: "Terrain & Constraint Scan",
    prompt:
      "Analyze terrain and environmental constraints for {{corridor_name}} using all terrain metrics with a 50 km sampling interval, and all environmental constraints with a 500 m buffer. Return hotspots and design implications.",
    icon: "geospatial",
    order: 2,
  },
  {
    group: "Geospatial",
    title: "Infrastructure Detection",
    prompt:
      "Detect all anchor infrastructure types along {{corridor_name}} and return geolocated candidates with confidence and planning relevance.",
    icon: "geospatial",
    order: 3,
  },
  {
    group: "Opportunity",
    title: "Anchor Load Catalog",
    prompt:
      "Build an anchor load catalog for {{corridor_name}} with current demand, projected demand, and bankability ranking.",
    icon: "opportunity",
    order: 1,
  },
  {
    group: "Opportunity",
    title: "Demand Growth Scenarios",
    prompt:
      "Model low/base/high demand trajectories for {{corridor_name}} over {{years}} years and identify top growth clusters.",
    icon: "opportunity",
    order: 2,
  },
  {
    group: "Opportunity",
    title: "Bankability Screen",
    prompt:
      "Assess bankability of top {{n}} opportunities using demand strength, revenue stability, execution risk, and financing readiness.",
    icon: "opportunity",
    order: 3,
  },
  {
    group: "Infrastructure",
    title: "Technical Design Pack",
    prompt:
      "Create a technical design recommendation for selected route {{route_id}} including voltage/capacity sizing, substation placement, phasing, and CAPEX/OPEX bands.",
    icon: "infrastructure",
    order: 1,
  },
  {
    group: "Infrastructure",
    title: "Co-location Savings",
    prompt:
      "Quantify co-location savings for {{corridor_name}} versus greenfield alignment and show savings by segment.",
    icon: "infrastructure",
    order: 2,
  },
  {
    group: "Infrastructure",
    title: "Phasing Strategy",
    prompt:
      "Produce a 3-phase build strategy for {{corridor_name}} linked to anchor-load activation and constructability constraints.",
    icon: "infrastructure",
    order: 3,
  },
  {
    group: "Economic",
    title: "GDP & Jobs Impact",
    prompt:
      "Estimate GDP, jobs, and poverty impact for {{corridor_name}} under base and upside scenarios. Include assumptions and sensitivity ranges.",
    icon: "economic",
    order: 1,
  },
  {
    group: "Economic",
    title: "Scenario Comparison",
    prompt:
      "Compare scenarios {{scenario_list}} and rank by development impact, affordability, and implementation risk.",
    icon: "economic",
    order: 2,
  },
  {
    group: "Financing",
    title: "Blended Finance Structure",
    prompt:
      "Propose blended finance options for {{corridor_name}} using concessional + commercial debt + equity. Return IRR/DSCR and risk notes.",
    icon: "financing",
    order: 1,
  },
  {
    group: "Financing",
    title: "DFI Matchmaking",
    prompt:
      "Match this project to likely DFI/investor profiles and explain fit, ticket size, tenor, and covenant expectations.",
    icon: "financing",
    order: 2,
  },
  {
    group: "Financing",
    title: "Sensitivity & Risk",
    prompt:
      "Run financing sensitivity on CAPEX, demand, tariff, and delay. Return breakpoints and mitigation actions.",
    icon: "financing",
    order: 3,
  },
  {
    group: "Stakeholder",
    title: "Stakeholder Map",
    prompt:
      "Map key stakeholders for {{corridor_name}} by influence, support level, and risk. Return engagement priorities.",
    icon: "stakeholder",
    order: 1,
  },
  {
    group: "Stakeholder",
    title: "Engagement Roadmap",
    prompt:
      "Generate a stakeholder engagement roadmap for the next {{months}} months with owner, message, and escalation path.",
    icon: "stakeholder",
    order: 2,
  },
  {
    group: "Monitoring",
    title: "Project Health Check",
    prompt:
      "Run a project health check for {{project_name}} with construction progress, financial variance, anchor realization, and top risks.",
    icon: "monitoring",
    order: 1,
  },
  {
    group: "Monitoring",
    title: "Alerts & Actions",
    prompt:
      "Detect implementation risks from latest data and return prioritized corrective actions with urgency and owner.",
    icon: "monitoring",
    order: 2,
  },
  {
    group: "Monitoring",
    title: "Investor Report Snapshot",
    prompt:
      "Create a concise investor snapshot: status (green/amber/red), key variances, DSCR/covenant view, top risks, and next milestones.",
    icon: "monitoring",
    order: 3,
  },
];

const GROUP_ORDER = [
  "Geospatial",
  "Opportunity",
  "Infrastructure",
  "Economic",
  "Financing",
  "Stakeholder",
  "Monitoring",
] as const;

const GROUP_ICON_BY_KEY: Record<string, ComponentType<{ className?: string }>> = {
  geospatial: Map,
  opportunity: TrendingUp,
  infrastructure: Pickaxe,
  economic: BarChart3,
  financing: HandCoins,
  stakeholder: Users2,
  monitoring: Activity,
};

export function ChatEmptyState({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isLoading,
  maxChars,
  error,
}: ChatEmptyStateProps) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const activePrompts = activeGroup
    ? STARTER_PROMPT_CHIPS.filter((chip) => chip.group === activeGroup).sort(
        (a, b) => a.order - b.order
      )
    : [];
  const activeIconKey = activePrompts[0]?.icon;
  const ActiveIcon = activeIconKey ? GROUP_ICON_BY_KEY[activeIconKey] : undefined;

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-1 flex-col"
      role="region"
      aria-label="Chat"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <h1 className="pb-6 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome Back
        </h1>

        {error !== undefined && error !== null && (
          <div className="mb-4 w-full max-w-2xl rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        <div className="w-full max-w-2xl">
          <ChatComposer
            value={input}
            onChange={onInputChange}
            onSubmit={onSubmit}
            onStop={onStop}
            disabled={isLoading}
            {...(typeof maxChars === "number" && { maxChars })}
          />
        </div>

        <div className="relative mt-5 w-full max-w-2xl min-h-10">
          {!activeGroup && (
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              {GROUP_ORDER.map((group) => {
                const iconKey = STARTER_PROMPT_CHIPS.find((chip) => chip.group === group)?.icon;
                const Icon = iconKey ? GROUP_ICON_BY_KEY[iconKey] : undefined;
                const isActive = group === activeGroup;
                return (
                  <Button
                    key={group}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-md px-3 shadow-none",
                      isActive && "border-foreground/40 bg-accent"
                    )}
                    onClick={() => {
                      setActiveGroup((previous) => (previous === group ? null : group));
                    }}
                  >
                    {Icon && <Icon className="size-4" />}
                    {group}
                  </Button>
                );
              })}
            </div>
          )}

          {activeGroup && (
            <div className="absolute inset-x-0 top-0 w-full rounded-3xl border bg-card p-4 shadow-none">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  {ActiveIcon && <ActiveIcon className="size-4" />}
                  {activeGroup}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setActiveGroup(null)}
                  aria-label="Close prompt palette"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {activePrompts.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    onMouseEnter={() => {
                      onInputChange(item.prompt);
                    }}
                    onFocus={() => {
                      onInputChange(item.prompt);
                    }}
                    onClick={() => {
                      onInputChange(item.prompt);
                      requestAnimationFrame(() => {
                        const inputEl = document.getElementById("chat-input");
                        inputEl?.focus();
                      });
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
