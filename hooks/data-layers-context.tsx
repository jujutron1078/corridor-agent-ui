"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useDataLayers, type DataLayerStore } from "@/hooks/use-data-layers";

type DataLayersContextValue = {
  store: DataLayerStore;
  toggleLayer: (layerId: string) => Promise<void>;
  projectSectorFilter: Set<string>;
  toggleProjectSector: (sector: string) => void;
  clearProjectSectorFilter: () => void;
  projectStatusFilter: Set<string>;
  toggleProjectStatus: (status: string) => void;
  clearProjectStatusFilter: () => void;
};

const DataLayersContext = createContext<DataLayersContextValue | null>(null);

export function DataLayersProvider({ children }: { children: ReactNode }) {
  const layers = useDataLayers(true);
  const [projectSectorFilter, setProjectSectorFilter] = useState<Set<string>>(new Set());
  const [projectStatusFilter, setProjectStatusFilter] = useState<Set<string>>(new Set());

  const toggleProjectSector = useCallback((sector: string) => {
    setProjectSectorFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector); else next.add(sector);
      return next;
    });
  }, []);

  const clearProjectSectorFilter = useCallback(() => setProjectSectorFilter(new Set()), []);

  const toggleProjectStatus = useCallback((status: string) => {
    setProjectStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  }, []);

  const clearProjectStatusFilter = useCallback(() => setProjectStatusFilter(new Set()), []);

  return (
    <DataLayersContext.Provider value={{
      ...layers,
      projectSectorFilter, toggleProjectSector, clearProjectSectorFilter,
      projectStatusFilter, toggleProjectStatus, clearProjectStatusFilter,
    }}>
      {children}
    </DataLayersContext.Provider>
  );
}

export function useDataLayersContext(): DataLayersContextValue | null {
  return useContext(DataLayersContext);
}
