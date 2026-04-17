"use client";

import { Suspense } from "react";
import type { CSSProperties } from "react";
import { useCallback, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ChatWorkspace } from "@/components/chat-workspace";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AssistantProvider } from "@/lib/assistant-context";
import { cn } from "@/lib/utils";

const sidebarStyle = {
  "--sidebar-width": "224px",
  "--header-height": "calc(var(--spacing) * 12)",
} as CSSProperties;
const MAP_OPEN_STORAGE_KEY = "corridor:layout:map-open";
const LAYOUT_STORAGE_EVENT = "corridor:layout-storage-change";

function subscribeLayoutStorage(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(LAYOUT_STORAGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(LAYOUT_STORAGE_EVENT, handleChange);
  };
}

function getSplitViewSnapshot() {
  return window.localStorage.getItem(MAP_OPEN_STORAGE_KEY) === "true";
}

type ChatPageShellProps = {
  className?: string;
};

export function ChatPageShell({ className }: ChatPageShellProps) {
  const searchParams = useSearchParams();
  const isDashboard = searchParams.get("view") === "dashboard";

  const isSplitView = useSyncExternalStore(
    subscribeLayoutStorage,
    getSplitViewSnapshot,
    () => false
  );

  const handleMapClick = useCallback(() => {
    const nextValue = !getSplitViewSnapshot();
    window.localStorage.setItem(MAP_OPEN_STORAGE_KEY, String(nextValue));
    window.dispatchEvent(new Event(LAYOUT_STORAGE_EVENT));
  }, []);

  return (
    <SidebarProvider
      className={cn("h-svh", className)}
      style={sidebarStyle}
      defaultOpen={!isDashboard}
    >
      <AssistantProvider>
        <Suspense fallback={null}>
          <AppSidebar variant="sidebar" mode="agent" />
        </Suspense>
        <SidebarInset className="min-h-0 overflow-hidden">
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <Suspense fallback={null}>
              <ChatWorkspace
                isMapCanvasOpen={isSplitView}
                onToggleMapCanvas={handleMapClick}
              />
            </Suspense>
          </div>
        </SidebarInset>
      </AssistantProvider>
    </SidebarProvider>
  );
}
