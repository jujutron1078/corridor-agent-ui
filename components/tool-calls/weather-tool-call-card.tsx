"use client";

import { parseToolResult } from "@/lib/utils";
import type { ToolCardProps } from "@/components/tool-calls/types";

export function WeatherToolCallCard({ toolCall }: ToolCardProps) {
  const { call, result, state } = toolCall;
  const isLoading = state === "pending";
  const parsedResult = parseToolResult(result);

  const location =
    typeof call.args.location === "string" ? call.args.location : "Unknown location";

  return (
    <div className="relative overflow-hidden rounded-xl border border-sky-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-600 to-indigo-600" />

      <div className="relative p-4 text-white">
        <div className="mb-3 flex items-center gap-2 text-xs text-white/80">
          <span className="font-medium">{location}</span>
          {isLoading && <span className="ml-auto">Loading...</span>}
        </div>

        {parsedResult.status === "error" ? (
          <div className="rounded-lg bg-red-500/30 p-3 text-sm text-red-100">
            {parsedResult.content}
          </div>
        ) : (
          <div className="text-lg font-medium">
            {parsedResult.content || "Fetching weather..."}
          </div>
        )}
      </div>
    </div>
  );
}
