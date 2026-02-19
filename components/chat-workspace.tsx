"use client";

import { useCallback, useSyncExternalStore, useState } from "react";

import { ChatPanel } from "@/components/chat-panel";
import { RightCanvasPanel } from "@/components/workspace/right-canvas-panel";
import { SiteHeader } from "@/components/site-header";
import { isSameMapData } from "@/lib/workspace/map-data-equality";
import type { MapOverlayData } from "@/lib/map-overlay";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type ChatWorkspaceProps = {
  isMapCanvasOpen: boolean;
  onToggleMapCanvas: () => void;
};

const CANVAS_SPLIT_SIZES_STORAGE_KEY = "corridor:layout:canvas-split-sizes";
const DEFAULT_CANVAS_SPLIT_SIZES: [number, number] = [55, 45];
const MIN_CHAT_PANEL_SIZE = 15;
const MIN_CANVAS_PANEL_SIZE = 25;
const LAYOUT_STORAGE_EVENT = "corridor:layout-storage-change";
let cachedSplitSizesRaw: string | null = null;
let cachedSplitSizesValue: [number, number] = DEFAULT_CANVAS_SPLIT_SIZES;

function readStoredSplitSizes(): [number, number] {
  const raw = window.localStorage.getItem(CANVAS_SPLIT_SIZES_STORAGE_KEY);
  if (raw === cachedSplitSizesRaw) return cachedSplitSizesValue;
  if (!raw) {
    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
    return cachedSplitSizesValue;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
      return DEFAULT_CANVAS_SPLIT_SIZES;
    }

    const left = Number(parsed[0]);
    const right = Number(parsed[1]);
    if (!Number.isFinite(left) || !Number.isFinite(right) || left < 10 || right < 10) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
      return DEFAULT_CANVAS_SPLIT_SIZES;
    }

    const total = left + right;
    if (total <= 0) {
      cachedSplitSizesRaw = raw;
      cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
      return DEFAULT_CANVAS_SPLIT_SIZES;
    }

    let normalizedLeft = (left / total) * 100;
    let normalizedRight = (right / total) * 100;
    if (normalizedLeft < MIN_CHAT_PANEL_SIZE) {
      normalizedLeft = MIN_CHAT_PANEL_SIZE;
      normalizedRight = 100 - MIN_CHAT_PANEL_SIZE;
    }
    if (normalizedRight < MIN_CANVAS_PANEL_SIZE) {
      normalizedRight = MIN_CANVAS_PANEL_SIZE;
      normalizedLeft = 100 - MIN_CANVAS_PANEL_SIZE;
    }

    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = [normalizedLeft, normalizedRight];
    return cachedSplitSizesValue;
  } catch {
    cachedSplitSizesRaw = raw;
    cachedSplitSizesValue = DEFAULT_CANVAS_SPLIT_SIZES;
    return DEFAULT_CANVAS_SPLIT_SIZES;
  }
}

function subscribeLayoutStorage(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(LAYOUT_STORAGE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(LAYOUT_STORAGE_EVENT, handleChange);
  };
}

export function ChatWorkspace({
  isMapCanvasOpen,
  onToggleMapCanvas,
}: ChatWorkspaceProps) {
  const [mapData, setMapData] = useState<MapOverlayData | null>(null);

  const splitSizes = useSyncExternalStore(
    subscribeLayoutStorage,
    readStoredSplitSizes,
    () => DEFAULT_CANVAS_SPLIT_SIZES
  );

  const handleMapDataChange = useCallback((data: MapOverlayData | null) => {
    setMapData((previous) => (isSameMapData(previous, data) ? previous : data));
  }, []);

  const handleLayoutChange = useCallback((sizes: number[]) => {
    if (sizes.length !== 2) return;

    const left = sizes[0];
    const right = sizes[1];
    if (!Number.isFinite(left) || !Number.isFinite(right)) return;

    window.localStorage.setItem(CANVAS_SPLIT_SIZES_STORAGE_KEY, JSON.stringify([left, right]));
    window.dispatchEvent(new Event(LAYOUT_STORAGE_EVENT));
  }, []);

  const [chatPanelSize, canvasPanelSize] = splitSizes;

  if (!isMapCanvasOpen) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <SiteHeader onMapClick={onToggleMapCanvas} />
        <div className="min-h-0 flex-1 px-4 py-3">
          <ChatPanel withBottomSpacing onMapDataChange={handleMapDataChange} />
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-full w-full overflow-hidden"
      onLayout={handleLayoutChange}
    >
      <ResizablePanel
        defaultSize={`${chatPanelSize}%`}
        minSize={MIN_CHAT_PANEL_SIZE}
        className="h-full"
      >
        <div className="flex h-full min-h-0 w-full flex-col">
          <SiteHeader onMapClick={onToggleMapCanvas} />
          <div className="min-h-0 flex-1 px-4 py-3">
            <ChatPanel withBottomSpacing onMapDataChange={handleMapDataChange} />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel
        defaultSize={`${canvasPanelSize}%`}
        minSize={MIN_CANVAS_PANEL_SIZE}
        className="h-full"
      >
        <RightCanvasPanel mapData={mapData} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
