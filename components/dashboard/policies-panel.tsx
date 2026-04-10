"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const COUNTRIES = ["NGA", "GHA", "CIV", "BEN", "TGO"];
const COLORS: Record<string, string> = {
  NGA: "#ef4444", GHA: "#22c55e", CIV: "#f59e0b", BEN: "#3b82f6", TGO: "#8b5cf6",
};

type ComparisonCountry = {
  country: string;
  country_name: string;
  investment: {
    tax_holiday_years: number | null;
    customs_exemption: boolean;
    vat_exemption: boolean;
    epz_corporate_tax: number | null;
    local_employment_pct: number | null;
    one_stop_shop: boolean;
    sector_priorities: string[];
    approval_days: Record<string, number>;
    bilateral_treaties: number;
  };
  environment: {
    eia_timeline_days: number | null;
    afforestation_ratio: number | null;
  };
  trade_agreements: string[];
};

type GovernanceRecord = {
  country_code: string;
  country_name: string;
  v2x_polyarchy?: number;
  v2x_libdem?: number;
  v2x_rule?: number;
  v2x_corr?: number;
  v2x_civlib?: number;
};

type Regional = {
  ecowas?: Record<string, unknown>;
  afcfta?: Record<string, unknown>;
  repository?: { topic: string; name: string; agency: string; description: string }[];
};

export function PoliciesPanel() {
  const [comparison, setComparison] = useState<ComparisonCountry[]>([]);
  const [regional, setRegional] = useState<Regional | null>(null);
  const [governance, setGovernance] = useState<GovernanceRecord[]>([]);

  useEffect(() => {
    fetch("/api/policy/comparison")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.countries) setComparison(d.countries);
        if (d?.regional) setRegional(d.regional);
      })
      .catch(() => {});

    fetch("/api/policy/governance")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.data) return;
        // API returns { NGA: {country_iso3, indicators: {...}}, ... }
        const raw = d.data;
        if (Array.isArray(raw)) { setGovernance(raw); return; }
        const list = Object.entries(raw as Record<string, { country_iso3?: string; country?: string; indicators?: Record<string, number> }>)
          .map(([code, val]) => ({
            country_code: val.country_iso3 ?? code,
            country_name: val.country ?? code,
            ...(val.indicators ?? {}),
          }));
        setGovernance(list as GovernanceRecord[]);
      })
      .catch(() => {});
  }, []);

  // Tax holiday chart
  const taxData = comparison.map((c) => ({
    country: c.country_name,
    years: c.investment.tax_holiday_years ?? 0,
  }));

  // Approval timelines
  const approvalData = comparison.map((c) => ({
    country: c.country_name,
    registration: c.investment.approval_days?.company_registration ?? 0,
    investment: c.investment.approval_days?.investment_approval ?? 0,
    environmental: c.investment.approval_days?.environmental_permits ?? 0,
    construction: c.investment.approval_days?.construction_permits ?? 0,
  }));

  // Governance radar
  const govRadar = governance.map((g) => ({
    country: g.country_code,
    Democracy: Math.round((g.v2x_polyarchy ?? 0) * 100),
    "Rule of Law": Math.round((g.v2x_rule ?? 0) * 100),
    "Civil Liberties": Math.round((g.v2x_civlib ?? 0) * 100),
    "Anti-Corruption": Math.round((1 - (g.v2x_corr ?? 0)) * 100),
  }));

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Policies & Governance</h1>
          <p className="text-sm text-muted-foreground">Investment incentives, regulatory environment, and governance indicators across the corridor</p>
        </div>

        {/* Regional frameworks — shown first */}
        {regional?.repository && (
          <Section title="Regional Policy Frameworks">
            <div className="grid gap-3 sm:grid-cols-2">
              {regional.repository.map((doc, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">{doc.topic}</div>
                  <div className="mt-1 text-sm font-medium">{doc.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{doc.agency}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{doc.description}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Country comparison table */}
        {comparison.length > 0 && (
          <Section title="Investment Climate Comparison">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Metric</th>
                    {comparison.map((c) => (
                      <th key={c.country} className="px-3 py-2 text-center font-medium">{c.country_name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <Row label="Tax Holiday" values={comparison.map((c) => `${c.investment.tax_holiday_years ?? "—"} years`)} />
                  <Row label="Customs Exempt" values={comparison.map((c) => c.investment.customs_exemption ? "Yes" : "No")} />
                  <Row label="VAT Exempt" values={comparison.map((c) => c.investment.vat_exemption ? "Yes" : "No")} />
                  <Row label="EPZ Corp Tax" values={comparison.map((c) => c.investment.epz_corporate_tax != null ? `${c.investment.epz_corporate_tax}%` : "—")} />
                  <Row label="Local Employment" values={comparison.map((c) => c.investment.local_employment_pct != null ? `≥${c.investment.local_employment_pct}%` : "—")} />
                  <Row label="One-Stop Shop" values={comparison.map((c) => c.investment.one_stop_shop ? "Yes" : "No")} />
                  <Row label="Bilateral Treaties" values={comparison.map((c) => String(c.investment.bilateral_treaties ?? "—"))} />
                  <Row label="EIA Timeline" values={comparison.map((c) => c.environment.eia_timeline_days ? `${c.environment.eia_timeline_days}d` : "—")} />
                  <Row label="Priority Sectors" values={comparison.map((c) => c.investment.sector_priorities.slice(0, 3).join(", "))} />
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Investment incentives comparison */}
        {taxData.length > 0 && (
          <Section title="Tax Holiday Duration (Years)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taxData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="years" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* Approval timelines */}
        {approvalData.length > 0 && (
          <Section title="Approval Timelines (Days)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={approvalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="registration" fill="#22c55e" name="Registration" stackId="a" />
                <Bar dataKey="investment" fill="#3b82f6" name="Investment Approval" stackId="a" />
                <Bar dataKey="environmental" fill="#f59e0b" name="Environmental" stackId="a" />
                <Bar dataKey="construction" fill="#ef4444" name="Construction" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* Governance radar */}
        {govRadar.length > 0 && (
          <Section title="Governance Indicators (V-Dem, 0-100)">
            <div className="flex flex-wrap gap-4">
              {govRadar.map((g) => (
                <div key={g.country} className="flex-1 min-w-[200px]">
                  <p className="mb-1 text-center text-xs font-semibold">{g.country}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={[
                      { metric: "Democracy", value: g.Democracy },
                      { metric: "Rule of Law", value: g["Rule of Law"] },
                      { metric: "Civil Lib.", value: g["Civil Liberties"] },
                      { metric: "Anti-Corrupt.", value: g["Anti-Corruption"] },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                      <Radar dataKey="value" stroke={COLORS[g.country] ?? "#666"} fill={COLORS[g.country] ?? "#666"} fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="px-3 py-1.5 font-medium text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-1.5 text-center tabular-nums">{v}</td>
      ))}
    </tr>
  );
}
