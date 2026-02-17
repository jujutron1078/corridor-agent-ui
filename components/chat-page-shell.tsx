"use client";

import { Suspense } from "react";
import type { CSSProperties } from "react";
import { useCallback, useSyncExternalStore } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ChatWorkspace } from "@/components/chat-workspace";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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

export function ChatPageShell() {
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
    <SidebarProvider className="h-svh" style={sidebarStyle}>
      <AppSidebar variant="sidebar" />
      <SidebarInset className="min-h-0 overflow-hidden">
        <SiteHeader onMapClick={handleMapClick} />
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <Suspense fallback={null}>
            <ChatWorkspace isSplitView={isSplitView} />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
