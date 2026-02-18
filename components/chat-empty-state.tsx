"use client";

import { ChatComposer } from "@/components/chat-composer";

type ChatEmptyStateProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isLoading: boolean;
  maxChars?: number;
  error?: unknown;
};

export function ChatEmptyState({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isLoading,
  maxChars,
  error,
}: ChatEmptyStateProps) {
  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-1 flex-col"
      role="region"
      aria-label="Chat"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center pt-[15%]">
        <p className="pb-6 text-center text-sm text-muted-foreground">
          Send a message to the geospatial intelligence agent...
        </p>

        {error !== undefined && error !== null && (
          <div className="mb-4 w-full max-w-2xl rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        <div className="w-full max-w-2xl">
          <ChatComposer
            value={input}
            onChange={onInputChange}
            onSubmit={onSubmit}
            onStop={onStop}
            disabled={isLoading}
            {...(typeof maxChars === "number" && { maxChars })}
          />
        </div>
      </div>
    </div>
  );
}
