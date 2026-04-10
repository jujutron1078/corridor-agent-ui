"use client";

import React from "react";
import type { Message } from "@langchain/langgraph-sdk";

import { MarkdownMessage } from "@/components/markdown-message";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { cn } from "@/lib/utils";
import { parseOpportunities, type OpportunityData } from "@/lib/api/opportunities";

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

/**
 * Split AI markdown content into text segments and embedded opportunity cards.
 * Strips the opportunity-json fenced code blocks from the rendered markdown
 * and renders OpportunityCard components in their place.
 */
function renderAiContentWithOpportunities(
  content: string,
  onSaveOpportunity?: (opportunity: OpportunityData) => Promise<void>
): React.ReactNode {
  const opportunities = parseOpportunities(content);

  if (opportunities.length === 0 || !onSaveOpportunity) {
    return <MarkdownMessage markdown={content} />;
  }

  // Remove the opportunity-json blocks from the markdown for clean rendering
  const cleanedMarkdown = content.replace(
    /```opportunity-json\s*\n[\s\S]*?```/g,
    ""
  );

  return (
    <>
      <MarkdownMessage markdown={cleanedMarkdown} />
      {opportunities.map((opp, i) => (
        <OpportunityCard
          key={`${opp.title}-${i}`}
          opportunity={opp}
          onSave={onSaveOpportunity}
        />
      ))}
    </>
  );
}

type MessageBubbleProps = {
  message: Message;
  onSaveOpportunity?: (opportunity: OpportunityData) => Promise<void>;
};

export function MessageBubble({ message, onSaveOpportunity }: MessageBubbleProps) {
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
          renderAiContentWithOpportunities(message.content, onSaveOpportunity)
        ) : (
          renderMessageContent(message.content)
        )}
      </div>
    </div>
  );
}
