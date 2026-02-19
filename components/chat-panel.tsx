"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import type { ToolCallWithResult } from "@langchain/langgraph-sdk/react";

import { ChatComposer } from "@/components/chat-composer";
import { ChatEmptyState } from "@/components/chat-empty-state";
import { ChatMessageList } from "@/components/chat-message-list";
import { useAssistant } from "@/lib/assistant-context";
import type { MapOverlayData } from "@/lib/map-overlay";
import { extractMapOverlayData, extractMapOverlayDataFromToolCalls } from "@/lib/map-overlay";

const LANGGRAPH_API_URL = "http://127.0.0.1:2024";
const THREAD_PARAM = "thread";

function getTextForScroll(content: Message["content"]): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "object" && block !== null && "text" in block) {
          return String((block as { text: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }

  return "";
}

type StreamWithToolCalls = {
  getToolCalls?: (message: Message) => ToolCallWithResult<unknown>[];
};

type ChatPanelProps = {
  withBottomSpacing?: boolean;
  onMapDataChange?: (data: MapOverlayData | null) => void;
};

const SCROLL_AT_BOTTOM_THRESHOLD_PX = 80;

export function ChatPanel({ withBottomSpacing = false, onMapDataChange }: ChatPanelProps) {
  const { assistantId } = useAssistant();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userJustSentRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const threadId = searchParams.get(THREAD_PARAM);
  const projectName = searchParams.get("project_name") ?? "None";
  const projectId = searchParams.get("project_id") ?? "None";

  const handleThreadId = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(THREAD_PARAM, id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const stream = useStream<{ messages: Message[] }>({
    assistantId,
    apiUrl: LANGGRAPH_API_URL,
    threadId: threadId ?? undefined,
    onThreadId: handleThreadId,
    reconnectOnMount: true,
    throttle: true,
  });

  const messages = stream.messages;
  const isLoading = Boolean(stream.isLoading);

  const getToolCalls = useCallback(
    (message: Message) => {
      const getToolCallsFromStream = (stream as unknown as StreamWithToolCalls).getToolCalls;
      return getToolCallsFromStream?.(message) ?? [];
    },
    [stream]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const lastMessageContentLength = useMemo(() => {
    if (messages.length === 0) return 0;
    return getTextForScroll(messages[messages.length - 1].content).length;
  }, [messages]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const shouldFollow = userJustSentRef.current || (el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_AT_BOTTOM_THRESHOLD_PX);
    if (shouldFollow) {
      userJustSentRef.current = false;
      scrollToBottom();
    }
  }, [messages.length, isLoading, lastMessageContentLength, scrollToBottom]);

  useEffect(() => {
    if (!onMapDataChange) return;

    const overlayFromToolMessages = extractMapOverlayData(messages);
    if (overlayFromToolMessages) {
      onMapDataChange(overlayFromToolMessages);
      return;
    }

    const toolCallsFromAiMessages = messages.flatMap((message) =>
      message.type === "ai" ? getToolCalls(message) : []
    );
    onMapDataChange(extractMapOverlayDataFromToolCalls(toolCallsFromAiMessages));
  }, [messages, onMapDataChange, getToolCalls]);

  useEffect(() => {
    if (!onMapDataChange || !threadId) return;

    const overlayFromToolMessages = extractMapOverlayData(messages);
    if (overlayFromToolMessages) return;

    const toolCallsFromAiMessages = messages.flatMap((message) =>
      message.type === "ai" ? getToolCalls(message) : []
    );
    if (extractMapOverlayDataFromToolCalls(toolCallsFromAiMessages)) return;

    let cancelled = false;

    const loadOverlayFromThreadState = async () => {
      try {
        const threadState = await stream.client.threads.getState<{
          messages?: Message[];
        }>(threadId);
        if (cancelled) return;

        const stateMessages = Array.isArray(threadState.values?.messages)
          ? threadState.values.messages
          : [];
        const overlayFromState = extractMapOverlayData(stateMessages);
        if (overlayFromState) {
          onMapDataChange(overlayFromState);
        }
      } catch {
        // Ignore state fetch failures and keep current UI.
      }
    };

    void loadOverlayFromThreadState();

    return () => {
      cancelled = true;
    };
  }, [messages, onMapDataChange, threadId, getToolCalls, stream.client]);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text || stream.isLoading) return;

    setInput("");
    userJustSentRef.current = true;

    stream.submit(
      {
        messages: [{ content: text, type: "human" }],
      },
      {
        streamResumable: true,
        context: {
          project_name: projectName,
          project_id: projectId,
        },
        optimisticValues(prev) {
          const prevMessages = prev?.messages ?? [];
          return {
            ...prev,
            messages: [...prevMessages, { type: "human" as const, content: text }],
          };
        },
      }
    );
  }, [input, projectId, projectName, stream]);

  const hasMessages = messages.length > 0 || isLoading;

  if (!hasMessages) {
    return (
      <ChatEmptyState
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onStop={() => stream.stop()}
        isLoading={isLoading}
        error={stream.error}
      />
    );
  }

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-1 flex-col"
      role="region"
      aria-label="Chat"
    >
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <ChatMessageList messages={messages} isLoading={isLoading} getToolCalls={getToolCalls} />
        <div ref={messagesEndRef} />
      </div>

      <div
        className={`supports-[backdrop-filter]:bg-background/80 z-10 bg-background/95 pt-2 backdrop-blur ${
          withBottomSpacing ? "pb-1" : ""
        }`}
      >
        {stream.error !== undefined && stream.error !== null && (
          <div className="mb-2 rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
            {stream.error instanceof Error ? stream.error.message : String(stream.error)}
          </div>
        )}

        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onStop={() => stream.stop()}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
