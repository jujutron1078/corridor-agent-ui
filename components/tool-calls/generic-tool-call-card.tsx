"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { parseToolResult, cn } from "@/lib/utils";
import type { ToolCardProps } from "@/components/tool-calls/types";

export function GenericToolCallCard({ toolCall }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { call, result, state } = toolCall;

  const isLoading = state === "pending";
  const parsedResult = parseToolResult(result);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left",
          "transition-colors hover:bg-muted/60"
        )}
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-mono text-sm font-medium">{call.name}</span>
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Processing..." : "Completed"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border px-3 py-3">
          <pre className="overflow-x-auto rounded border border-border/50 bg-background p-2 text-xs">
            {JSON.stringify(call.args, null, 2)}
          </pre>
          {result && (
            <div className="rounded-lg border border-border/50 bg-background p-3 text-sm">
              {parsedResult.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
