"use client";

import React from "react";
import { Field, FieldGroup } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_CHARS = 280;

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  disabled?: boolean;
  maxChars?: number;
  placeholder?: string;
  className?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled = false,
  maxChars = DEFAULT_MAX_CHARS,
  placeholder = "Write a message...",
  className,
}: ChatComposerProps) {
  const charCount = value.length;
  const canSend = charCount > 0 && charCount <= maxChars && !disabled;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value.slice(0, maxChars));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <FieldGroup className={cn("w-full shrink-0", className)}>
      <Field>
        <InputGroup className="min-h-[100px] rounded-2xl has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0">
          <InputGroupTextarea
            id="chat-input"
            placeholder={placeholder}
            rows={2}
            className="min-h-[56px]"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Ask me anything to get started"
          />
          <InputGroupAddon align="block-end">
            <InputGroupText
              className={cn(
                "text-muted-foreground text-xs",
                charCount > maxChars && "text-destructive"
              )}
            >
              {charCount}/{maxChars}
            </InputGroupText>
            {disabled ? (
              <InputGroupButton
                variant="secondary"
                size="icon-sm"
                className="ml-auto rounded-full bg-black text-white hover:bg-black/90 hover:text-white"
                type="button"
                onClick={onStop}
                aria-label="Stop"
              >
                <Square className="size-4 fill-current" />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                variant="default"
                size="icon-sm"
                className="ml-auto rounded-full"
                type="button"
                onClick={onSubmit}
                disabled={!canSend}
                aria-label="Send"
              >
                <ArrowUp className="size-4" />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </FieldGroup>
  );
}
