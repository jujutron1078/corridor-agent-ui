"use client";

import * as React from "react";

const ASSISTANT_STORAGE_KEY = "corridor:assistant-id";
const DEFAULT_ASSISTANT_ID = "orchestrator_agent";

export const ASSISTANTS = [
  { id: "orchestrator_agent", label: "Orchestrator" },
  { id: "geospatial_intelligence_agent", label: "Geospatial Intelligence" },
  { id: "opportunity_identification_agent", label: "Opportunity Identification" },
  { id: "infrastructure_optimization_agent", label: "Infrastructure Optimization" },
  { id: "economic_impact_modeling_agent", label: "Economic Impact Modeling" },
  { id: "financing_optimization_agent", label: "Financing Optimization" },
  { id: "stakeholder_intelligence_agent", label: "Stakeholder Intelligence" },
] as const;

export type AssistantId = (typeof ASSISTANTS)[number]["id"];

type AssistantContextValue = {
  assistantId: string;
  setAssistantId: (id: string) => void;
};

const AssistantContext = React.createContext<AssistantContextValue | null>(null);

export function useAssistant() {
  const ctx = React.useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return ctx;
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [assistantId, setAssistantIdState] = React.useState(DEFAULT_ASSISTANT_ID);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(ASSISTANT_STORAGE_KEY);
    if (stored && ASSISTANTS.some((a) => a.id === stored)) {
      setAssistantIdState(stored);
    }
  }, []);

  const setAssistantId = React.useCallback((id: string) => {
    setAssistantIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ASSISTANT_STORAGE_KEY, id);
    }
  }, []);

  const value = React.useMemo(
    () => ({ assistantId, setAssistantId }),
    [assistantId, setAssistantId]
  );

  return (
    <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
  );
}
