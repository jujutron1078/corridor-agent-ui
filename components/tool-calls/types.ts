import type { ToolMessage } from "@langchain/langgraph-sdk";
import type { ToolCallState } from "@langchain/langgraph-sdk/react";

export type ToolCallViewModel = {
  id: string;
  call: {
    name: string;
    args: Record<string, unknown>;
  };
  result?: ToolMessage;
  state: ToolCallState;
};

export type ToolCardProps = {
  toolCall: ToolCallViewModel;
};
