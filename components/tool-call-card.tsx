"use client";

import type { ToolCallWithResult } from "@langchain/langgraph-sdk/react";
import type { ToolMessage } from "@langchain/langgraph-sdk";
import type { ToolCallState } from "@langchain/langgraph-sdk/react";

import { FALLBACK_TOOL_CARD, TOOL_CARD_REGISTRY } from "@/components/tool-calls/tool-card-registry";
import type { ToolCallViewModel } from "@/components/tool-calls/types";

type ToolCallLike = {
  id?: string;
  call: {
    name: string;
    args: Record<string, unknown>;
  };
  result?: ToolMessage;
  state: ToolCallState;
};

function normalizeToolCall(toolCall: ToolCallWithResult<unknown>): ToolCallViewModel {
  const data = toolCall as unknown as ToolCallLike;

  return {
    id: data.id ?? `${data.call.name}-${JSON.stringify(data.call.args)}`,
    call: {
      name: data.call.name,
      args: data.call.args,
    },
    result: data.result,
    state: data.state,
  };
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCallWithResult<unknown> }) {
  const viewModel = normalizeToolCall(toolCall);
  const Renderer = TOOL_CARD_REGISTRY[viewModel.call.name] ?? FALLBACK_TOOL_CARD;

  return <Renderer toolCall={viewModel} />;
}
