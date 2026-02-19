"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ASSISTANTS, useAssistant } from "@/lib/assistant-context";
import { ChevronDown, PanelRightOpen } from "lucide-react";

type SiteHeaderProps = {
  onMapClick?: () => void;
};

export function SiteHeader({ onMapClick }: SiteHeaderProps) {
  const { assistantId, setAssistantId } = useAssistant();
  const currentLabel = ASSISTANTS.find((a) => a.id === assistantId)?.label ?? assistantId;

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
