"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { MapOverlayData } from "@/lib/map-overlay";
import {
  artifactToCanvasDocument,
  buildGeneratedArtifacts,
  EXAMPLE_CANVAS_DOCUMENTS,
} from "@/lib/workspace/canvas-documents";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CANVAS_RIGHT_PANEL_TAB_STORAGE_KEY = "corridor:canvas:right-panel-tab";
const CANVAS_ACTIVE_DOCUMENT_STORAGE_KEY = "corridor:canvas:active-document-id";

type RightCanvasTab = "map" | "artifacts";

type RightCanvasPanelProps = {
  mapData: MapOverlayData | null;
  hideDataLayers?: boolean;
  dashboardMode?: boolean;
  compactDataLayers?: boolean;
};

const MapPanel = dynamic(
  () => import("@/components/map-panel").then((mod) => mod.MapPanel),
  { ssr: false }
);

export function RightCanvasPanel({
  mapData,
  hideDataLayers,
  dashboardMode,
  compactDataLayers = false,
}: RightCanvasPanelProps) {
  const [activeTab, setActiveTab] = useState<RightCanvasTab>("map");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(EXAMPLE_CANVAS_DOCUMENTS[0].id);
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, string>>({});
  const [hiddenDocumentIds, setHiddenDocumentIds] = useState<string[]>([]);

  const generatedArtifacts = useMemo(() => buildGeneratedArtifacts(mapData), [mapData]);
  const allDocuments = useMemo(() => {
    const generatedDocuments = generatedArtifacts.map(artifactToCanvasDocument);
    return [...EXAMPLE_CANVAS_DOCUMENTS, ...generatedDocuments];
  }, [generatedArtifacts]);
  const visibleDocuments = useMemo(
    () => allDocuments.filter((document) => !hiddenDocumentIds.includes(document.id)),
    [allDocuments, hiddenDocumentIds]
  );

  useEffect(() => {
    const storedRightPanelTab = window.localStorage.getItem(CANVAS_RIGHT_PANEL_TAB_STORAGE_KEY);
    if (storedRightPanelTab === "map" || storedRightPanelTab === "artifacts") {
      setActiveTab(storedRightPanelTab);
    }

    const storedDocumentId = window.localStorage.getItem(CANVAS_ACTIVE_DOCUMENT_STORAGE_KEY);
    if (storedDocumentId) {
      setSelectedDocumentId(storedDocumentId);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CANVAS_RIGHT_PANEL_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedDocumentId) {
      window.localStorage.setItem(CANVAS_ACTIVE_DOCUMENT_STORAGE_KEY, selectedDocumentId);
      return;
    }

    window.localStorage.removeItem(CANVAS_ACTIVE_DOCUMENT_STORAGE_KEY);
  }, [selectedDocumentId]);

  useEffect(() => {
    if (visibleDocuments.length === 0) {
      if (selectedDocumentId !== "") {
        setSelectedDocumentId("");
      }
      return;
    }

    const selectedExists = visibleDocuments.some((document) => document.id === selectedDocumentId);
    if (!selectedExists) {
      setSelectedDocumentId(visibleDocuments[0].id);
    }
  }, [visibleDocuments, selectedDocumentId]);

  const activeDocument =
    visibleDocuments.find((document) => document.id === selectedDocumentId) ?? visibleDocuments[0] ?? null;
  const activeDocumentId = activeDocument?.id ?? "";
  const activeDocumentContent = activeDocumentId
    ? (documentDrafts[activeDocumentId] ?? activeDocument?.content ?? "")
    : "";

  // Dashboard mode: render only the data-layer sidebar or just the map (no tabs)
  if (dashboardMode) {
    if (!hideDataLayers) {
      // Render ONLY the data-layer sidebar panel
      return (
        <div className="h-full">
          <MapPanel data={mapData} hideDataLayers={false} dataLayerSidebarOnly />
        </div>
      );
    }
    // Render ONLY the map, no sidebar, no tabs
    return (
      <div className="h-full">
        <MapPanel data={mapData} hideDataLayers noDataLayers />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {activeTab === "artifacts" ? (
        <div className="h-(--header-height) shrink-0 border-b bg-background">
          <div className="flex h-full items-end gap-0 overflow-x-auto px-2 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {visibleDocuments.map((document) => (
              <button
                key={document.id}
                type="button"
                className={`relative -mb-px -mr-px flex max-w-[240px] items-center gap-1 rounded-t-[11px] border px-3 py-1.5 text-sm transition-all ${
                  activeDocument?.id === document.id
                    ? "z-10 border-border border-b-transparent bg-background text-foreground"
                    : "z-0 border-transparent bg-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSelectedDocumentId(document.id)}
              >
                <span className="truncate">{document.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Close ${document.title}`}
                  className="ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    setHiddenDocumentIds((previous) =>
                      previous.includes(document.id) ? previous : [...previous, document.id]
                    );
                    if (selectedDocumentId === document.id) {
                      const remaining = visibleDocuments.filter((item) => item.id !== document.id);
                      setSelectedDocumentId(remaining[0]?.id ?? "");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    event.stopPropagation();
                    setHiddenDocumentIds((previous) =>
                      previous.includes(document.id) ? previous : [...previous, document.id]
                    );
                    if (selectedDocumentId === document.id) {
                      const remaining = visibleDocuments.filter((item) => item.id !== document.id);
                      setSelectedDocumentId(remaining[0]?.id ?? "");
                    }
                  }}
                >
                  <X className="size-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "map" ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <MapPanel
            data={mapData}
            hideDataLayers={hideDataLayers}
            compactDataLayers={compactDataLayers}
            noDataLayers={hideDataLayers && !compactDataLayers}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/10">
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {activeDocument ? (
              <div className="flex h-full min-h-0 flex-col">
                <p className="py-2 text-xs font-medium text-muted-foreground">{activeDocument.title}</p>
                {activeDocument.table ? (
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
                    {activeDocumentContent ? (
                      <div className="rounded-md border bg-background p-3 text-sm leading-6 whitespace-pre-wrap text-foreground/90">
                        {activeDocumentContent}
                      </div>
                    ) : null}

                    <Table className="rounded-md border bg-background">
                      <TableHeader>
                        <TableRow>
                          {activeDocument.table.columns.map((column) => (
                            <TableHead key={column}>{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeDocument.table.rows.map((row, rowIndex) => (
                          <TableRow key={`${row[0] ?? "row"}-${rowIndex}`}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={`${cellIndex}-${cell}`}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                  </div>
                ) : (
                  <textarea
                    value={activeDocumentContent}
                    onChange={(event) => {
                      if (!activeDocumentId) return;
                      setDocumentDrafts((previous) => ({
                        ...previous,
                        [activeDocumentId]: event.target.value,
                      }));
                    }}
                    className={`min-h-0 flex-1 resize-none bg-transparent outline-none ${
                      activeDocument.isJson
                        ? "font-mono text-xs leading-5 text-foreground/85"
                        : "text-sm leading-6 text-foreground/90"
                    }`}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                No document selected.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 z-10 mt-auto grid h-10 w-full grid-cols-2 divide-x divide-border border-t border-border bg-background">
        <button
          type="button"
          className={`h-full w-full text-sm font-medium ${
            activeTab === "map" ? "text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("map")}
        >
          Map Canvas
        </button>
        <button
          type="button"
          className={`h-full w-full text-sm font-medium ${
            activeTab === "artifacts" ? "text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("artifacts")}
        >
          Artifact Canvas
        </button>
      </div>
    </div>
  );
}
