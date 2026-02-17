import { clsx, type ClassValue } from "clsx";
import type { ToolMessage } from "@langchain/langgraph-sdk";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseToolResult(result?: ToolMessage): {
  status: string;
  content: string;
} {
  if (!result) {
    return { status: "pending", content: "" };
  }

  const raw = typeof result.content === "string" ? result.content : String(result.content);

  try {
    const parsed = JSON.parse(raw) as { status?: string; content?: string };
    return {
      status: parsed.status ?? "success",
      content: parsed.content ?? raw,
    };
  } catch {
    return { status: "success", content: raw };
  }
}
