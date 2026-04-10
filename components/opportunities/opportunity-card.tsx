"use client";

import { useState } from "react";
import {
  MapPin,
  TrendingUp,
  Users,
  DollarSign,
  Bookmark,
  Check,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OpportunityData } from "@/lib/api/opportunities";

function formatUsd(value: number | undefined): string {
  if (value === undefined || value === null) return "N/A";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

type OpportunityCardProps = {
  opportunity: OpportunityData;
  onSave: (opportunity: OpportunityData) => Promise<void>;
};

export function OpportunityCard({ opportunity, onSave }: OpportunityCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(opportunity);
      setSaved(true);
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{opportunity.title}</h4>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {opportunity.sector}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {opportunity.country}
              {opportunity.location?.name ? `, ${opportunity.location.name}` : ""}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant={saved ? "outline" : "default"}
          onClick={handleSave}
          disabled={saving || saved}
          className="shrink-0"
        >
          {saving ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : saved ? (
            <Check className="mr-1 size-3" />
          ) : (
            <Bookmark className="mr-1 size-3" />
          )}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">{opportunity.summary}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {opportunity.bankability_score != null && (
          <div className="rounded-md bg-muted p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Bankability</div>
            <div className="text-sm font-medium">
              {(opportunity.bankability_score * 100).toFixed(0)}%
            </div>
          </div>
        )}
        {opportunity.estimated_value_usd != null && (
          <div className="rounded-md bg-muted p-2">
            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
              <DollarSign className="size-3" /> Investment
            </div>
            <div className="text-sm font-medium">
              {formatUsd(opportunity.estimated_value_usd)}
            </div>
          </div>
        )}
        {opportunity.employment_impact != null && (
          <div className="rounded-md bg-muted p-2">
            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
              <Users className="size-3" /> Jobs
            </div>
            <div className="text-sm font-medium">
              {opportunity.employment_impact.toLocaleString()}
            </div>
          </div>
        )}
        {opportunity.gdp_multiplier != null && (
          <div className="rounded-md bg-muted p-2">
            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
              <TrendingUp className="size-3" /> GDP Mult.
            </div>
            <div className="text-sm font-medium">
              {opportunity.gdp_multiplier.toFixed(2)}x
            </div>
          </div>
        )}
      </div>

      {opportunity.risk_level && (
        <div className="mt-2 text-xs text-muted-foreground">
          Risk:{" "}
          <span
            className={
              opportunity.risk_level === "low"
                ? "text-green-600"
                : opportunity.risk_level === "high"
                  ? "text-red-600"
                  : "text-yellow-600"
            }
          >
            {opportunity.risk_level.charAt(0).toUpperCase() + opportunity.risk_level.slice(1)}
          </span>
        </div>
      )}
    </div>
  );
}
