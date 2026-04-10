"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import {
  DATA_LAYERS,
  INFRASTRUCTURE_LAYER_IDS,
  INFRA_TYPE_MAP,
  type DataLayerConfig,
} from "@/lib/data-layers";

export type DataLayerState = {
  active: boolean;
  loading: boolean;
  data: FeatureCollection | null;
  /** For arc layers: array of arc objects; for raster: tile_url string */
  rawData?: unknown;
  featureCount: number;
  error: string | null;
};

export type DataLayerStore = Record<string, DataLayerState>;

const emptyState = (): DataLayerState => ({
  active: false,
  loading: false,
  data: null,
  featureCount: 0,
  error: null,
});

const DATA_LAYERS_STORAGE_KEY = "corridor:map:data-layers";

function loadPersistedActive(enableDefaults = false): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DATA_LAYERS_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  // First visit: activate defaultOn layers only in dashboard mode
  if (enableDefaults) {
    const defaults = new Set<string>();
    for (const layer of DATA_LAYERS) {
      if (layer.defaultOn) defaults.add(layer.id);
    }
    return defaults;
  }
  return new Set();
}

function persistActive(active: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DATA_LAYERS_STORAGE_KEY, JSON.stringify([...active]));
}

/**
 * Hook that manages data layer visibility and lazy-fetches GeoJSON from the backend.
 * Infrastructure sub-layers share one endpoint and are split client-side.
 * @param enableDefaults - if true, activate defaultOn layers on first visit (used by dashboard)
 */
export function useDataLayers(enableDefaults = false) {
  const [store, setStore] = useState<DataLayerStore>(() => {
    const initial: DataLayerStore = {};
    const persisted = loadPersistedActive(enableDefaults);
    for (const layer of DATA_LAYERS) {
      initial[layer.id] = { ...emptyState(), active: persisted.has(layer.id) };
    }
    return initial;
  });

  // Cache raw infrastructure FeatureCollection so we don't refetch for each sub-layer
  const infraCacheRef = useRef<FeatureCollection | null>(null);
  const infraFetchingRef = useRef(false);

  const fetchLayerData = useCallback(async (layer: DataLayerConfig) => {
    const isInfraSubLayer = (INFRASTRUCTURE_LAYER_IDS as readonly string[]).includes(layer.id);

    if (isInfraSubLayer) {
      // If we already have the infra cache, just filter
      if (infraCacheRef.current) {
        return filterInfraFeatures(infraCacheRef.current, layer.id);
      }

      // Fetch the full infrastructure endpoint once
      if (!infraFetchingRef.current) {
        infraFetchingRef.current = true;
        const response = await fetch("/api/infrastructure");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const geojson = (await response.json()) as FeatureCollection;
        infraCacheRef.current = geojson;
        infraFetchingRef.current = false;
      } else {
        // Another sub-layer is fetching — wait for it
        while (infraFetchingRef.current) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
      return filterInfraFeatures(infraCacheRef.current!, layer.id);
    }

    // Normal endpoint fetch
    const response = await fetch(layer.endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();

    // Arc layers return { arcs: [...] }
    if (layer.geometryType === "arc") {
      const arcs = json.arcs ?? [];
      // Store as rawData, return empty FeatureCollection for compatibility
      return { __rawData: json, type: "FeatureCollection", features: [], __count: arcs.length } as unknown as FeatureCollection;
    }

    // Raster layers return { tile_url, vis_params, ... }
    if (layer.geometryType === "raster") {
      return { __rawData: json, type: "FeatureCollection", features: [], __count: json.tile_url ? 1 : 0 } as unknown as FeatureCollection;
    }

    // Some endpoints wrap geojson in { features, summary } or return FeatureCollection directly
    if (json.type === "FeatureCollection") return json as FeatureCollection;
    if (json.features) return { type: "FeatureCollection", features: json.features } as FeatureCollection;

    // Conflict endpoint returns { geojson, summary }
    if (json.geojson) return json.geojson as FeatureCollection;

    return json as FeatureCollection;
  }, []);

  const toggleLayer = useCallback(
    async (layerId: string) => {
      const current = store[layerId];
      if (!current) return;

      const nowActive = !current.active;

      // Optimistic update
      setStore((prev) => ({
        ...prev,
        [layerId]: { ...prev[layerId], active: nowActive, loading: nowActive && !prev[layerId].data },
      }));

      // Persist
      const activeIds = new Set<string>();
      for (const [id, s] of Object.entries(store)) {
        if (id === layerId ? nowActive : s.active) activeIds.add(id);
      }
      persistActive(activeIds);

      // Fetch data if turning on and not yet loaded
      if (nowActive && !current.data) {
        const layer = DATA_LAYERS.find((l) => l.id === layerId);
        if (!layer) return;

        try {
          const data = await fetchLayerData(layer);
          setStore((prev) => ({
            ...prev,
            [layerId]: {
              ...prev[layerId],
              data,
              featureCount: (data as unknown as { __count?: number }).__count ?? data.features?.length ?? 0,
              rawData: (data as unknown as { __rawData?: unknown }).__rawData,
              loading: false,
              error: null,
            },
          }));
        } catch (err) {
          setStore((prev) => ({
            ...prev,
            [layerId]: {
              ...prev[layerId],
              loading: false,
              error: err instanceof Error ? err.message : "Fetch failed",
            },
          }));
        }
      }
    },
    [store, fetchLayerData],
  );

  // Load data for layers that were persisted as active on mount
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    for (const layer of DATA_LAYERS) {
      if (store[layer.id]?.active && !store[layer.id]?.data) {
        fetchLayerData(layer).then((data) => {
          setStore((prev) => ({
            ...prev,
            [layer.id]: {
              ...prev[layer.id],
              data,
              featureCount: (data as unknown as { __count?: number }).__count ?? data.features?.length ?? 0,
              rawData: (data as unknown as { __rawData?: unknown }).__rawData,
              loading: false,
              error: null,
            },
          }));
        }).catch(() => {
          setStore((prev) => ({
            ...prev,
            [layer.id]: { ...prev[layer.id], loading: false, error: "Fetch failed" },
          }));
        });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { store, toggleLayer };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function filterInfraFeatures(
  fullCollection: FeatureCollection,
  layerId: string,
): FeatureCollection {
  const infraType = INFRA_TYPE_MAP[layerId];
  if (!infraType) return { type: "FeatureCollection", features: [] };

  const filtered = fullCollection.features.filter(
    (f) => f.properties?.infrastructure_type === infraType,
  );

  return { type: "FeatureCollection", features: filtered };
}
