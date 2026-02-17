"use client";

import type { Message } from "@langchain/langgraph-sdk";
import type { ToolCallWithResult } from "@langchain/langgraph-sdk/react";

import { MessageBubble } from "@/components/message-bubble";
import { ToolCallCard } from "@/components/tool-call-card";

type ChatMessageListProps = {
  messages: Message[];
  isLoading: boolean;
  getToolCalls: (message: Message) => ToolCallWithResult<unknown>[];
};

export function ChatMessageList({
  messages,
  isLoading,
  getToolCalls,
}: ChatMessageListProps) {
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

        return <MessageBubble key={message.id ?? idx} message={message} />;
      })}

      {isLoading && (
        <div className="flex justify-start">
          <span className="animate-pulse text-sm text-muted-foreground">Thinking...</span>
        </div>
      )}
    </div>
  );
}
