"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CORRIDOR_LENGTH_KM, CORRIDOR_ECONOMIC_VALUE, CORRIDOR_COUNTRIES } from "@/lib/corridor-route";

export type DashboardTab = "overview" | "map" | "chat" | "policies" | "synergies" | "reports";

const TABS: { key: DashboardTab; label: string }[] = [
  { key: "overview", label: "OVERVIEW" },
  { key: "map", label: "INTERACTIVE MAP" },
  { key: "chat", label: "AI AGENTS" },
  { key: "policies", label: "POLICIES" },
  { key: "synergies", label: "SYNERGIES" },
  { key: "reports", label: "REPORTS" },
];

type Props = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
};

export function DashboardNavBar({ activeTab, onTabChange }: Props) {
  const [gdp, setGdp] = useState<string>(CORRIDOR_ECONOMIC_VALUE);

  useEffect(() => {
    fetch("/api/indicators/summary")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.indicators?.GDP) return;
        const total = Object.values(d.indicators.GDP as Record<string, { value: number }>)
          .reduce((sum, e) => sum + (Number(e?.value) || 0), 0);
        if (total > 0) {
          setGdp(total >= 1e12 ? `$${(total / 1e12).toFixed(1)}T` : `$${(total / 1e9).toFixed(0)}B`);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
      {/* Branding */}
      <div className="flex items-center gap-2 mr-6">
        <Image src="/corridor-favicon.svg" alt="" width={24} height={24} className="shrink-0" />
        <span className="text-sm font-bold tracking-tight whitespace-nowrap">
          Abidjan-Lagos <span className="text-primary">Corridor</span>
        </span>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`whitespace-nowrap px-3 py-1.5 text-[11px] font-semibold tracking-wide rounded-md transition ${
              activeTab === tab.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* KPIs */}
      <div className="hidden md:flex items-center gap-4 ml-4 shrink-0">
        <KpiBadge value={`~${CORRIDOR_LENGTH_KM.toLocaleString()} km`} label="CORRIDOR LENGTH" />
        <KpiBadge value={gdp} label="ECONOMIC VALUE" />
        <KpiBadge value={`${CORRIDOR_COUNTRIES} Countries`} label="CI · GH · TG · BJ · NG" />
      </div>
    </div>
  );
}

function KpiBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-right">
      <div className="text-sm font-bold tabular-nums leading-tight">{value}</div>
      <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
