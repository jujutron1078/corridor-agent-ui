import type { ReactNode } from "react";

import { GenericToolCallCard } from "@/components/tool-calls/generic-tool-call-card";
import { ThinkingToolCallCard } from "@/components/tool-calls/thinking-tool-call-card";
import { TodoToolCallCard } from "@/components/tool-calls/todo-tool-call-card";
import { WeatherToolCallCard } from "@/components/tool-calls/weather-tool-call-card";
import type { ToolCardProps } from "@/components/tool-calls/types";

export type ToolCardComponent = (props: ToolCardProps) => ReactNode;

export const TOOL_CARD_REGISTRY: Record<string, ToolCardComponent> = {
  get_weather: WeatherToolCallCard,
  todo: TodoToolCallCard,
  todos: TodoToolCallCard,
  update_todos: TodoToolCallCard,
  thinking: ThinkingToolCallCard,
  think: ThinkingToolCallCard,
  reflection: ThinkingToolCallCard,
};

export const FALLBACK_TOOL_CARD = GenericToolCallCard;
