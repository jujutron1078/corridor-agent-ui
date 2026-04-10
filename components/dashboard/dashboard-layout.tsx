"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DataLayersProvider } from "@/hooks/data-layers-context";
import { DashboardNavBar, type DashboardTab } from "@/components/dashboard/dashboard-nav-bar";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";
import { InteractiveMapView } from "@/components/dashboard/interactive-map-view";
import { PoliciesPanel } from "@/components/dashboard/policies-panel";
import { ChatPanel } from "@/components/chat-panel";
import { RightCanvasPanel } from "@/components/workspace/right-canvas-panel";
import type { MapOverlayData } from "@/lib/map-overlay";
import { isSameMapData } from "@/lib/workspace/map-data-equality";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export function DashboardLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>("map");
  const [mapData, setMapData] = useState<MapOverlayData | null>(null);

  // Clear stale thread param when entering dashboard (prevents 404 on server restart)
  useEffect(() => {
    if (searchParams.has("thread")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("thread");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapDataChange = useCallback((data: MapOverlayData | null) => {
    setMapData((prev) => (isSameMapData(prev, data) ? prev : data));
  }, []);

  return (
    <DataLayersProvider>
      <div className="flex h-full min-h-0 w-full flex-col">
        <DashboardNavBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="min-h-0 flex-1">
          {activeTab === "map" && <InteractiveMapView />}
          {activeTab === "overview" && <AnalyticsPanel />}
          {activeTab === "chat" && (
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
              <ResizablePanel defaultSize="55%" minSize={20} className="h-full">
                <div className="flex h-full min-h-0 flex-col px-4 py-3">
                  <ChatPanel withBottomSpacing onMapDataChange={handleMapDataChange} />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="45%" minSize={25} className="h-full">
                <RightCanvasPanel mapData={mapData} hideDataLayers />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
          {activeTab === "policies" && <PoliciesPanel />}
          {activeTab === "synergies" && <PlaceholderTab title="Synergies" description="Cross-border collaboration opportunities, value chain linkages, and co-location benefits." />}
          {activeTab === "reports" && <PlaceholderTab title="Reports" description="Generate investment briefs, due diligence reports, and corridor analysis documents." />}
        </div>
      </div>
    </DataLayersProvider>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="mt-4 text-xs text-muted-foreground/60">Coming soon</p>
      </div>
    </div>
  );
}
