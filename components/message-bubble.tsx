"use client";

import React from "react";
import type { Message } from "@langchain/langgraph-sdk";

import { MarkdownMessage } from "@/components/markdown-message";
import { cn } from "@/lib/utils";

function renderMessageContent(content: Message["content"]): React.ReactNode {
  if (typeof content === "string") {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // Some providers return an array of content blocks
  if (Array.isArray(content)) {
    return (
      <>
        {content.map((block, i) => {
          // Common shape: { type: "text", text: string }
          if (
            typeof block === "object" &&
            block !== null &&
            "type" in block &&
            (block as { type?: unknown }).type === "text" &&
            "text" in block
          ) {
            return (
              <span key={i} className="whitespace-pre-wrap">
                {(block as { text: string }).text}
              </span>
            );
          }

          // Fallback shape: { text: string }
          if (typeof block === "object" && block !== null && "text" in block) {
            return (
              <span key={i} className="whitespace-pre-wrap">
                {(block as { text: string }).text}
              </span>
            );
          }

          return null;
        })}
      </>
    );
  }

  return null;
}

export function MessageBubble({ message }: { message: Message }) {
  const isHuman = message.type === "human";
  const isAi = message.type === "ai";

  return (
    <div className={cn("flex", isHuman ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "text-sm",
          isHuman
            ? "max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-left"
            : "w-full text-left"
        )}
      >
        {isAi && typeof message.content === "string" ? (
          <MarkdownMessage markdown={message.content} />
        ) : (
          renderMessageContent(message.content)
        )}
      </div>
    </div>
  );
}

