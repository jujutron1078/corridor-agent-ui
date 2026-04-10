"use client";

import type { Message } from "@langchain/langgraph-sdk";
import type { ToolCallWithResult } from "@langchain/langgraph-sdk/react";

import { MessageBubble } from "@/components/message-bubble";
import { ToolCallCard } from "@/components/tool-call-card";
import { parseOpportunities, type OpportunityData } from "@/lib/api/opportunities";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";

/**
 * Extract opportunities from tool messages in the conversation.
 * The bridge passes raw tool_results alongside the synthesis — these
 * contain the real calculated data, not the LLM's summary.
 */
function extractOpportunitiesFromMessages(messages: Message[]): OpportunityData[] {
  for (const msg of messages) {
    if (msg.type !== "tool") continue;
    const content = typeof msg.content === "string" ? msg.content : "";
    const opps = parseOpportunities(content);
    if (opps.length > 0) return opps;
  }
  return [];
}

type ChatMessageListProps = {
  messages: Message[];
  isLoading: boolean;
  getToolCalls: (message: Message) => ToolCallWithResult<unknown>[];
  onSaveOpportunity?: (opportunity: OpportunityData) => Promise<void>;
};

export function ChatMessageList({
  messages,
  isLoading,
  getToolCalls,
  onSaveOpportunity,
}: ChatMessageListProps) {
  // Extract opportunities from tool messages (real data from the tool)
  const toolOpportunities = onSaveOpportunity
    ? extractOpportunitiesFromMessages(messages)
    : [];

  return (
    <div className="flex flex-col gap-4 px-1 py-4" aria-live="polite">
      {messages.map((message, idx) => {
        if (message.type === "tool") return null;

        if (message.type === "ai") {
          const toolCalls = getToolCalls(message);

          if (toolCalls.length > 0) {
            return (
              <div key={message.id ?? idx} className="flex flex-col gap-2">
                {toolCalls.map((toolCall) => (
                  <ToolCallCard key={toolCall.id} toolCall={toolCall} />
                ))}
              </div>
            );
          }

          const hasContent =
            typeof message.content === "string"
              ? message.content.trim().length > 0
              : Array.isArray(message.content)
                ? message.content.length > 0
                : false;

          if (!hasContent) return null;
        }

        return (
          <MessageBubble
            key={message.id ?? idx}
            message={message}
            onSaveOpportunity={onSaveOpportunity}
          />
        );
      })}

      {/* Render opportunity cards from tool data (real calculated values) */}
      {toolOpportunities.length > 0 && onSaveOpportunity && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            {toolOpportunities.length} opportunities identified — save to your portfolio:
          </div>
          {toolOpportunities.map((opp, i) => (
            <OpportunityCard
              key={`tool-opp-${opp.title}-${i}`}
              opportunity={opp}
              onSave={onSaveOpportunity}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-start">
          <span className="animate-pulse text-sm text-muted-foreground">Thinking...</span>
        </div>
      )}
    </div>
  );
}
