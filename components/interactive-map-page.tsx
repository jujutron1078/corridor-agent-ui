"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import { useTimeAnimation } from "@/app/dashboard/_components/use-time-animation";
import { KpiSidebar } from "@/app/dashboard/_components/kpi-sidebar";
import { TimeSlider } from "@/app/dashboard/_components/time-slider";
import { NodeDetailPanel } from "@/app/dashboard/_components/node-detail-panel";
import { LayerControls } from "@/app/dashboard/_components/layer-controls";
import { StoryGuide, StoryGuideButton } from "@/app/dashboard/_components/story-guide";

const PulseMap = dynamic(
  () => import("@/app/dashboard/_components/pulse-map").then((m) => m.PulseMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black text-white/40">
        Loading map...
      </div>
    ),
  }
);

export interface DashboardSnapshot {
  year: number;
  corridor: {
    nodes: { name: string; lon: number; lat: number }[];
    countries: string[];
    country_names: Record<string, string>;
    buffer_km: number;
    centerline: [number, number][];
    aoi_geojson: Record<string, unknown>;
  };
  trade_arcs: {
    source: [number, number];
    target: [number, number];
    commodity: string;
    value_usd: number;
    year: number;
    flow: string;
    processing_stage?: string;
    weight_kg?: number;
    reporter_name?: string;
    target_name?: string;
  }[];
  investments: {
    position: [number, number];
    name: string;
    sector: string;
    cost_usd: number | null;
    status: string;
    year: number | null;
    financier: string | null;
  }[];
  conflict_events: {
    position: [number, number];
    fatalities: number;
    event_type: string;
    date: string;
  }[];
  kpis: {
    label: string;
    value: number | null;
    unit: string;
    trend: number[];
    trend_years: number[];
    country: string | null;
  }[];
  nightlights_tile_url: string | null;
  data_availability: Record<string, number[]>;
}

export type LayerVisibility = {
  nightlights: boolean;
  tradeFlows: boolean;
  investments: boolean;
  conflict: boolean;
  corridor: boolean;
  nodes: boolean;
};

const DEFAULT_LAYERS: LayerVisibility = {
  nightlights: true,
  tradeFlows: true,
  investments: true,
  conflict: true,
  corridor: true,
  nodes: true,
};

export function InteractiveMapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("corridor:dashboard:story-seen");
  });

  const [layers, setLayers] = useState<LayerVisibility>(() => {
    if (typeof window === "undefined") return DEFAULT_LAYERS;
    const saved = localStorage.getItem("corridor:dashboard:layers");
    if (!saved) return DEFAULT_LAYERS;
    try {
      return { ...DEFAULT_LAYERS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_LAYERS;
    }
  });

  const availableYears = data?.data_availability
    ? Array.from(new Set(Object.values(data.data_availability).flat())).sort()
    : Array.from({ length: 11 }, (_, i) => 2015 + i);

  const initialYear = searchParams.get("year")
    ? Number.parseInt(searchParams.get("year") ?? "0", 10)
    : availableYears[availableYears.length - 1] ?? 2024;

  const { currentYear, isPlaying, play, pause, setYear } = useTimeAnimation(availableYears, 2000);

  useEffect(() => {
    if (initialYear && availableYears.includes(initialYear)) setYear(initialYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/dashboard/snapshot?year=${currentYear}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentYear]);

  useEffect(() => {
    localStorage.setItem("corridor:dashboard:layers", JSON.stringify(layers));
  }, [layers]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(currentYear));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear]);

  const handleLayerToggle = useCallback((key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="-m-6 relative h-[calc(100vh-6.5rem)] w-[calc(100%+3rem)] overflow-hidden">
      <PulseMap data={data} layers={layers} loading={loading} onNodeClick={setSelectedNode} />

      <KpiSidebar kpis={data?.kpis ?? []} loading={loading} />

      <TimeSlider
        years={availableYears}
        currentYear={currentYear}
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
        onYearChange={setYear}
        dataAvailability={data?.data_availability ?? {}}
      />

      <LayerControls layers={layers} onToggle={handleLayerToggle} />

      {selectedNode && data && (
        <NodeDetailPanel
          nodeName={selectedNode}
          corridor={data.corridor}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {showGuide && (
        <StoryGuide
          onLayerChange={setLayers}
          defaultLayers={DEFAULT_LAYERS}
          onDismiss={() => setShowGuide(false)}
        />
      )}

      {!showGuide && (
        <StoryGuideButton
          onClick={() => {
            localStorage.removeItem("corridor:dashboard:story-seen");
            setShowGuide(true);
          }}
        />
      )}

      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-lg bg-red-900/80 px-4 py-2 text-sm text-white backdrop-blur-sm">
          Dashboard data unavailable: {error}
        </div>
      )}
    </div>
  );
}
