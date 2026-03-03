"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import type { ToolCardProps } from "@/components/tool-calls/types";

type TodoItem = {
  id: string;
  label: string;
  status: string;
  description?: string;
};

function normalizeTodos(input: unknown): TodoItem[] {
  if (!Array.isArray(input)) return [];

  return input.reduce<TodoItem[]>((acc, item) => {
    if (typeof item !== "object" || item === null) return acc;
    const record = item as Record<string, unknown>;
    if (typeof record.label !== "string") return acc;

    acc.push({
      id: typeof record.id === "string" ? record.id : "",
      label: record.label,
      status: typeof record.status === "string" ? record.status : "pending",
      description: typeof record.description === "string" ? record.description : undefined,
    });
    return acc;
  }, []);
}

function getTodosFromResultContent(content: unknown): TodoItem[] {
  if (typeof content !== "string") return [];

  try {
    const parsed = JSON.parse(content) as { todos?: unknown };
    return normalizeTodos(parsed.todos);
  } catch {
    return [];
  }
}

function getStatusIcon(status: string) {
  if (status === "in_progress") {
    return <Clock3 className="mt-0.5 size-4 text-foreground" />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="mt-0.5 size-4 text-foreground" />;
  }
  return <Circle className="mt-0.5 size-4 text-foreground" />;
}

export function TodoToolCallCard({ toolCall }: ToolCardProps) {
  const [isPlanOpen, setIsPlanOpen] = useState(true);
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const todosFromArgs = normalizeTodos((toolCall.call.args as { todos?: unknown }).todos);
  const todos =
    todosFromArgs.length > 0 ? todosFromArgs : getTodosFromResultContent(toolCall.result?.content);

  if (todos.length === 0) return null;

  return (
    <div className="px-1 py-1">
      <button
        type="button"
        className="text-sm font-medium"
        onClick={() => setIsPlanOpen((previous) => !previous)}
        aria-expanded={isPlanOpen}
      >
        Plan
      </button>

      {isPlanOpen && (
        <ul className="mt-2 space-y-2">
          {todos.map((todo, index) => {
            const todoKey = todo.id || String(index);
            const isOpen = openTodoId === todoKey;

            return (
              <li key={`${todo.id}-${todo.label}`} className="flex items-start gap-2 min-w-0">
                {getStatusIcon(todo.status)}
                <div className="min-w-0">
                  <button
                    type="button"
                    className="text-left text-sm leading-5"
                    onClick={() =>
                      setOpenTodoId((previous) => (previous === todoKey ? null : todoKey))
                    }
                  >
                    {todo.label}
                  </button>
                  {isOpen && todo.description && (
                    <p className="text-xs text-muted-foreground">{todo.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
