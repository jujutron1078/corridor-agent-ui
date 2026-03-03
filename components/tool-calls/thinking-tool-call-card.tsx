"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { ToolCardProps } from "@/components/tool-calls/types";
import { cn } from "@/lib/utils";

const STREAM_STEP = 2;
const STREAM_INTERVAL_MS = 18;

function getReflectionArg(args: Record<string, unknown>): string {
  return typeof args.reflection === "string" ? args.reflection : "";
}

export function ThinkingToolCallCard({ toolCall }: ToolCardProps) {
  const state = String(toolCall.state);
  const isLoading = state === "pending" || state === "running" || state === "in_progress";
  const reflection = getReflectionArg(toolCall.call.args);
  const [expanded, setExpanded] = useState(true);
  const [visibleChars, setVisibleChars] = useState(0);

  const visibleReflection = useMemo(
    () => reflection.slice(0, Math.min(visibleChars, reflection.length)),
    [reflection, visibleChars]
  );

  useEffect(() => {
    if (isLoading) {
      setExpanded(true);
      return;
    }
    setExpanded(false);
  }, [isLoading]);

  useEffect(() => {
    if (!reflection) return;
    if (!isLoading) {
      setVisibleChars(reflection.length);
      return;
    }

    const target = reflection.length;
    const timer = window.setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= target) {
          window.clearInterval(timer);
          return target;
        }
        return Math.min(prev + STREAM_STEP, target);
      });
    }, STREAM_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isLoading, reflection]);

  return (
    <div className="overflow-hidden px-1 py-1">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          "flex w-full items-center gap-2 py-1 text-left",
          "transition-colors hover:bg-muted/60"
        )}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">Thinking</span>
      </button>

      {expanded && (
        <div className="pt-1 text-sm text-muted-foreground">
          {visibleReflection || (isLoading ? "Thinking..." : "")}
          {isLoading && <span className="animate-pulse">|</span>}
        </div>
      )}
    </div>
  );
}
