"use client";

import { useCallback, useMemo, useState } from "react";
import { Client } from "@langchain/langgraph-sdk";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createThreadAction } from "@/app/actions/threads";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ASSISTANTS, useAssistant } from "@/lib/assistant-context";
import { toast } from "sonner";
import { ChevronDown, Loader2, PanelRightOpen, Plus } from "lucide-react";

type SiteHeaderProps = {
  onMapClick?: () => void;
};

const LANGGRAPH_API_URL = "http://127.0.0.1:2024";
const THREADS_UPDATED_EVENT = "corridor:threads-updated";
type ThreadsUpdatedEventDetail = {
  projectId: string;
  projectName: string;
  threadId: string;
};

export function SiteHeader({ onMapClick }: SiteHeaderProps) {
  const { assistantId, setAssistantId } = useAssistant();
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const client = useMemo(() => new Client({ apiUrl: LANGGRAPH_API_URL }), []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedProjectId = searchParams.get("project_id");
  const selectedProjectName = searchParams.get("project_name");
  const hasSelectedProject = Boolean(selectedProjectId && selectedProjectName);
  const currentLabel = ASSISTANTS.find((a) => a.id === assistantId)?.label ?? assistantId;
  const createThreadForCurrentProject = useCallback(async () => {
    if (isCreatingThread) return;
    if (!selectedProjectId || !selectedProjectName) {
      toast.error("Select a project before creating a chat.");
      return;
    }

    setIsCreatingThread(true);
    try {
      const createdThread = await client.threads.create({
        metadata: {
          project_name: selectedProjectName,
          project_id: selectedProjectId,
        },
      });

      const backendResult = await createThreadAction({
        threadId: createdThread.thread_id,
        projectId: selectedProjectId,
      });
      if (!backendResult.ok) {
        await client.threads.delete(createdThread.thread_id).catch(() => undefined);
        toast.error(backendResult.message ?? "Unable to create chat.");
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("thread", createdThread.thread_id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      window.dispatchEvent(
        new CustomEvent<ThreadsUpdatedEventDetail>(THREADS_UPDATED_EVENT, {
          detail: {
            projectId: selectedProjectId,
            projectName: selectedProjectName,
            threadId: createdThread.thread_id,
          },
        })
      );
    } catch {
      toast.error("Unable to create chat.");
    } finally {
      setIsCreatingThread(false);
    }
  }, [client, isCreatingThread, pathname, router, searchParams, selectedProjectId, selectedProjectName]);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 font-medium text-foreground hover:bg-accent"
              aria-label="Select assistant"
            >
              <span className="truncate max-w-[180px] sm:max-w-[240px]">{currentLabel}</span>
              <ChevronDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuRadioGroup value={assistantId} onValueChange={setAssistantId}>
              {ASSISTANTS.map((assistant) => (
                <DropdownMenuRadioItem
                  key={assistant.id}
                  value={assistant.id}
                >
                  {assistant.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Create new chat in current project"
          title={hasSelectedProject ? "New chat in current project" : "Select a project first"}
          onClick={() => {
            void createThreadForCurrentProject();
          }}
          disabled={!hasSelectedProject || isCreatingThread}
        >
          {isCreatingThread ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex"
            onClick={onMapClick}
            aria-label="Toggle canvas view"
            title="Toggle canvas view"
          >
            <PanelRightOpen className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
