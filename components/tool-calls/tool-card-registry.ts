import type { ReactNode } from "react";

import { GenericToolCallCard } from "@/components/tool-calls/generic-tool-call-card";
import { WeatherToolCallCard } from "@/components/tool-calls/weather-tool-call-card";
import type { ToolCardProps } from "@/components/tool-calls/types";

export type ToolCardComponent = (props: ToolCardProps) => ReactNode;

export const TOOL_CARD_REGISTRY: Record<string, ToolCardComponent> = {
  get_weather: WeatherToolCallCard,
};

export const FALLBACK_TOOL_CARD = GenericToolCallCard;
