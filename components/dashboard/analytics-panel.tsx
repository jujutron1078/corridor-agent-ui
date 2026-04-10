"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Types (matching actual backend responses) ────────────────────────────────

type IndicatorEntry = { year: number; value: number; country: string };
type IndicatorSummary = {
  country: string | null;
  country_name: string;
  indicators: Record<string, Record<string, IndicatorEntry>>;
};
type PricePoint = { date: string; price: number; commodity: string; stage?: string; unit?: string };
type TradeRow = { year: number; flow: string; processing_stage: string; trade_value_usd: number; net_weight_kg: number };
type TradeFlows = { country: string; commodity: string; total_records: number; data: TradeRow[] };
type Partner = { partner_code: number; partner_name: string; trade_value_usd: number; net_weight_kg: number };
type PartnersResponse = { country: string; commodity: string; flow: string; partners: Partner[] };
type EnergySummary = { total_plants: number; total_capacity_mw: number; by_fuel: Record<string, number> };
type EnergyByCountry = { country: string; plants: number; capacity: number };

type TabKey = "economy" | "trade" | "energy" | "sectors";

const COUNTRIES = ["NGA", "GHA", "CIV", "BEN", "TGO"];
const COUNTRY_NAMES: Record<string, string> = {
  NGA: "Nigeria", GHA: "Ghana", CIV: "Ivory Coast", BEN: "Benin", TGO: "Togo",
};
const COMMODITIES = ["cocoa", "gold", "oil", "rubber", "cashew", "palm_oil", "cotton", "fish", "timber"];
const PIE_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#06b6d4"];

// ── Formatting ───────────────────────────────────────────────────────────────

function fmtUsd(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNum(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtPct(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function indVal(entry: unknown): number {
  if (entry == null) return NaN;
  if (typeof entry === "number") return entry;
  if (typeof entry === "object" && "value" in (entry as Record<string, unknown>)) {
    return Number((entry as IndicatorEntry).value);
  }
  return Number(entry);
}

// ── Main Component ───────────────────────────────────────────────────────────

type ExtraKpi = { label: string; value: string; subtitle?: string };

export function AnalyticsPanel() {
  const [tab, setTab] = useState<TabKey>("economy");
  const [indicators, setIndicators] = useState<IndicatorSummary | null>(null);
  const [extraKpis, setExtraKpis] = useState<ExtraKpi[]>([]);
  const [sectorData, setSectorData] = useState<{ projects: Record<string, number>; mfg: Record<string, number>; conflict: Record<string, number>; crops: string[]; tourism: { country: string; arrivals: number }[] }>({ projects: {}, mfg: {}, conflict: {}, crops: [], tourism: [] });

  useEffect(() => {
    fetch("/api/indicators/summary")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setIndicators(d as IndicatorSummary); })
      .catch(() => {});

    // Fetch additional KPIs
    const extras: ExtraKpi[] = [];
    const update = () => setExtraKpis([...extras]);

    fetch("/api/projects-enriched/summary").then((r) => r.json()).then((d) => {
      if (d?.total_projects) extras.push({ label: "Projects", value: String(d.total_projects), subtitle: d.total_cost_usd_million ? `$${(d.total_cost_usd_million / 1000).toFixed(0)}B pipeline` : "" });
      if (d?.by_sector) setSectorData((prev) => ({ ...prev, projects: d.by_sector }));
      update();
    }).catch(() => {});

    fetch("/api/manufacturing/summary").then((r) => r.json()).then((d) => {
      if (d?.total) extras.push({ label: "Companies", value: String(d.total), subtitle: "Manufacturing" });
      if (d?.by_sector) setSectorData((prev) => ({ ...prev, mfg: d.by_sector }));
      update();
    }).catch(() => {});

    fetch("/api/conflict").then((r) => r.json()).then((d) => {
      const s = d?.summary ?? {};
      if (s.total_events) extras.push({ label: "Conflict Events", value: s.total_events.toLocaleString(), subtitle: `${(s.total_fatalities ?? 0).toLocaleString()} fatalities` });
      if (s.by_event_type) setSectorData((prev) => ({ ...prev, conflict: s.by_event_type }));
      update();
    }).catch(() => {});

    fetch("/api/energy/plants").then((r) => r.json()).then((d) => {
      const features = d?.features ?? [];
      let totalCap = 0;
      for (const f of features) totalCap += Number(f.properties?.capacity_mw ?? 0);
      if (features.length) extras.push({ label: "Power Plants", value: String(features.length), subtitle: `${(totalCap / 1000).toFixed(1)} GW` });
      update();
    }).catch(() => {});

    fetch("/api/agriculture-enriched/summary").then((r) => r.json()).then((d) => {
      if (d?.crops) {
        extras.push({ label: "Crops", value: String(d.crops.length), subtitle: `${d.total_records ?? 0} records` });
        setSectorData((prev) => ({ ...prev, crops: d.crops }));
      }
      update();
    }).catch(() => {});

    fetch("/api/tourism/comparison").then((r) => r.json()).then((d) => {
      if (!d || typeof d !== "object") return;
      const entries = Array.isArray(d.countries) ? d.countries : Object.values(d);
      const list = (entries as { country?: string; annual_arrivals?: number }[]).map((c) => ({ country: c.country ?? "?", arrivals: c.annual_arrivals ?? 0 })).filter((c) => c.arrivals > 0);
      if (list.length) {
        const totalArrivals = list.reduce((s, c) => s + c.arrivals, 0);
        extras.push({ label: "Tourism", value: totalArrivals >= 1e6 ? `${(totalArrivals / 1e6).toFixed(1)}M` : `${(totalArrivals / 1000).toFixed(0)}K`, subtitle: "annual arrivals" });
        setSectorData((prev) => ({ ...prev, tourism: list }));
      }
      update();
    }).catch(() => {});
  }, []);

  const kpis = indicators ? buildKpis(indicators) : [];
  const allKpis = [...kpis, ...extraKpis];

  return (
    <div className="flex h-full flex-col bg-background text-xs">
      {/* KPI rows */}
      <div className="grid grid-cols-2 gap-2 border-b border-border p-3 sm:grid-cols-4 lg:grid-cols-8">
        {allKpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
            <div className="mt-0.5 text-base font-bold tabular-nums">{kpi.value}</div>
            {kpi.subtitle && <div className="text-[10px] text-muted-foreground">{kpi.subtitle}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {(["economy", "trade", "energy", "sectors"] as TabKey[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[12px] font-medium capitalize transition ${
              tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "sectors" ? "Projects & Sectors" : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "economy" && <EconomyTab indicators={indicators} />}
        {tab === "trade" && <TradeTab />}
        {tab === "energy" && <EnergyTab />}
        {tab === "sectors" && <SectorsTab data={sectorData} />}
      </div>
    </div>
  );
}

// ── Sectors / Projects Tab ─────────────────────────────────────────────────

function SectorsTab({ data }: { data: { projects: Record<string, number>; mfg: Record<string, number>; conflict: Record<string, number>; crops: string[]; tourism: { country: string; arrivals: number }[] } }) {
  const projectSectors = Object.entries(data.projects)
    .map(([s, c]) => ({ sector: typeof s === "string" && s.startsWith("{") ? "Other" : s, count: c as number }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const mfgSectors = Object.entries(data.mfg)
    .map(([s, c]) => ({ sector: s, count: c as number }))
    .filter((d) => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);

  const conflictTypes = Object.entries(data.conflict)
    .map(([t, c]) => ({ type: t, count: c as number }))
    .sort((a, b) => b.count - a.count);

  const tourismChart = data.tourism.sort((a, b) => b.arrivals - a.arrivals);

  return (
    <div className="space-y-4">
      {projectSectors.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Infrastructure Projects by Sector</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, projectSectors.length * 28)}>
            <BarChart data={projectSectors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="sector" tick={{ fontSize: 9 }} width={180} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {mfgSectors.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Manufacturing by Sector</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, mfgSectors.length * 28)}>
            <BarChart data={mfgSectors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="sector" tick={{ fontSize: 9 }} width={180} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {conflictTypes.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Conflict Events by Type</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, conflictTypes.length * 28)}>
            <BarChart data={conflictTypes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 9 }} width={160} />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tourismChart.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Tourism Arrivals by Country</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tourismChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => (v as number).toLocaleString()} />
              <Bar dataKey="arrivals" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.crops.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Agricultural Crops Tracked</h3>
          <div className="flex flex-wrap gap-1.5">
            {data.crops.map((crop) => (
              <span key={crop} className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-medium text-green-800">{crop}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI builder ──────────────────────────────────────────────────────────────

function buildKpis(data: IndicatorSummary) {
  const kpis: { label: string; value: string; subtitle?: string }[] = [];
  const ind = data.indicators;

  if (ind.GDP) {
    const total = Object.values(ind.GDP).reduce((sum, e) => sum + indVal(e), 0);
    kpis.push({ label: "Corridor GDP", value: fmtUsd(total), subtitle: "5 countries" });
  }
  if (ind.GDP_GROWTH) {
    const vals = Object.values(ind.GDP_GROWTH).map(indVal).filter(Number.isFinite);
    kpis.push({ label: "GDP Growth", value: fmtPct(vals.reduce((a, b) => a + b, 0) / vals.length), subtitle: "avg" });
  }
  if (ind.INFLATION) {
    const vals = Object.values(ind.INFLATION).map(indVal).filter(Number.isFinite);
    kpis.push({ label: "Inflation", value: fmtPct(vals.reduce((a, b) => a + b, 0) / vals.length), subtitle: "avg" });
  }
  if (ind.TRADE_PCT_GDP) {
    const vals = Object.values(ind.TRADE_PCT_GDP).map(indVal).filter(Number.isFinite);
    kpis.push({ label: "Trade / GDP", value: fmtPct(vals.reduce((a, b) => a + b, 0) / vals.length) });
  }
  return kpis.slice(0, 4);
}

// ── Economy Tab ──────────────────────────────────────────────────────────────

function EconomyTab({ indicators }: { indicators: IndicatorSummary | null }) {
  if (!indicators) return <p className="py-8 text-center text-muted-foreground">Loading...</p>;
  const ind = indicators.indicators;

  const gdpData = ind.GDP
    ? Object.entries(ind.GDP).map(([iso, e]) => ({ country: COUNTRY_NAMES[iso] ?? iso, value: indVal(e) })).filter((d) => Number.isFinite(d.value))
    : [];

  const gdpPcData = ind.GDP_PER_CAPITA
    ? Object.entries(ind.GDP_PER_CAPITA).map(([iso, e]) => ({ country: COUNTRY_NAMES[iso] ?? iso, value: indVal(e) })).filter((d) => Number.isFinite(d.value))
    : [];

  const tableRows = COUNTRIES.map((iso) => ({
    country: COUNTRY_NAMES[iso] ?? iso,
    gdp: indVal(ind.GDP?.[iso]), gdpPc: indVal(ind.GDP_PER_CAPITA?.[iso]),
    growth: indVal(ind.GDP_GROWTH?.[iso]), inflation: indVal(ind.INFLATION?.[iso]),
    trade: indVal(ind.TRADE_PCT_GDP?.[iso]), fdi: indVal(ind.FDI?.[iso]),
  }));

  return (
    <div className="space-y-5">
      {gdpData.length > 0 && (
        <ChartSection title="GDP by Country (USD)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gdpData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtUsd(v)} />
              <Tooltip formatter={(v) => fmtUsd(v)} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      {gdpPcData.length > 0 && (
        <ChartSection title="GDP per Capita (USD)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gdpPcData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtUsd(v)} />
              <Tooltip formatter={(v) => fmtUsd(v)} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      <ChartSection title="Country Comparison">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-2 py-1.5 text-left font-medium">Country</th>
                <th className="px-2 py-1.5 text-right font-medium">GDP</th>
                <th className="px-2 py-1.5 text-right font-medium">GDP/Cap</th>
                <th className="px-2 py-1.5 text-right font-medium">Growth</th>
                <th className="px-2 py-1.5 text-right font-medium">Inflation</th>
                <th className="px-2 py-1.5 text-right font-medium">FDI%</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.country} className="border-b border-border/50 last:border-0">
                  <td className="px-2 py-1.5 font-medium">{r.country}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(r.gdp)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(r.gdpPc)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtPct(r.growth)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtPct(r.inflation)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtPct(r.fdi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartSection>
    </div>
  );
}

// ── Trade Tab (with partner data) ────────────────────────────────────────────

function TradeTab() {
  const [commodity, setCommodity] = useState("cocoa");
  const [country, setCountry] = useState("NGA");
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [tradeFlows, setTradeFlows] = useState<TradeFlows | null>(null);
  const [exportPartners, setExportPartners] = useState<Partner[]>([]);
  const [importPartners, setImportPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async (com: string, cty: string) => {
    setLoading(true);
    const [priceRes, flowRes, expRes, impRes] = await Promise.allSettled([
      fetch(`/api/trade/prices?commodity=${com}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/trade/flows?commodity=${com}&country=${cty}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/trade/partners?commodity=${com}&country=${cty}&flow=export&top_n=10`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/trade/partners?commodity=${com}&country=${cty}&flow=import&top_n=10`).then((r) => r.ok ? r.json() : null),
    ]);
    setPrices(priceRes.status === "fulfilled" && priceRes.value?.data ? priceRes.value.data : []);
    setTradeFlows(flowRes.status === "fulfilled" && flowRes.value?.data ? flowRes.value : null);
    setExportPartners(expRes.status === "fulfilled" && expRes.value?.partners ? expRes.value.partners : []);
    setImportPartners(impRes.status === "fulfilled" && impRes.value?.partners ? impRes.value.partners : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(commodity, country); }, [commodity, country, fetchAll]);

  const tradeByYear = Array.isArray(tradeFlows?.data)
    ? Object.values(
        tradeFlows!.data.reduce<Record<number, { year: number; exports: number; imports: number }>>((acc, row) => {
          if (!acc[row.year]) acc[row.year] = { year: row.year, exports: 0, imports: 0 };
          if (row.flow?.toLowerCase() === "export") acc[row.year].exports += (Number(row.trade_value_usd) || 0);
          else acc[row.year].imports += (Number(row.trade_value_usd) || 0);
          return acc;
        }, {}),
      ).sort((a, b) => a.year - b.year)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Selector label="Commodity" value={commodity} onChange={setCommodity}
          options={COMMODITIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1).replace("_", " ") }))} />
        <Selector label="Country" value={country} onChange={setCountry}
          options={COUNTRIES.map((iso) => ({ value: iso, label: COUNTRY_NAMES[iso] }))} />
        {loading && <span className="text-[10px] text-muted-foreground">Loading...</span>}
      </div>

      {prices.length > 0 && (
        <ChartSection title={`${commodity.replace("_", " ")} — Price Trend (${prices[0]?.unit ?? "$/kg"})`}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={prices}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => String(v).slice(0, 7)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(l) => `${l}`} />
              <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      {tradeByYear.length > 0 && (
        <ChartSection title={`${COUNTRY_NAMES[country]} — ${commodity} Trade Flows`}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tradeByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtUsd(v)} />
              <Tooltip formatter={(v) => fmtUsd(v)} />
              <Bar dataKey="exports" fill="#22c55e" name="Exports" radius={[4, 4, 0, 0]} />
              <Bar dataKey="imports" fill="#ef4444" name="Imports" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      {/* Export destinations */}
      {exportPartners.length > 0 && (
        <ChartSection title="Top Export Destinations">
          <PartnerTable partners={exportPartners} />
        </ChartSection>
      )}

      {/* Import sources */}
      {importPartners.length > 0 && (
        <ChartSection title="Top Import Sources">
          <PartnerTable partners={importPartners} />
        </ChartSection>
      )}

      {!loading && prices.length === 0 && !tradeFlows && (
        <p className="py-6 text-center text-muted-foreground">No data for this selection.</p>
      )}
    </div>
  );
}

function PartnerTable({ partners }: { partners: Partner[] }) {
  const maxVal = Math.max(...partners.map((p) => p.trade_value_usd), 1);
  return (
    <div className="space-y-1">
      {partners.filter((p) => p.partner_code !== 0).map((p) => (
        <div key={p.partner_code} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 shrink-0 truncate font-medium">{p.partner_name}</span>
          <div className="flex-1">
            <div
              className="h-4 rounded-sm bg-primary/20"
              style={{ width: `${(p.trade_value_usd / maxVal) * 100}%`, minWidth: 4 }}
            >
              <div className="h-full rounded-sm bg-primary/60" style={{ width: "100%" }} />
            </div>
          </div>
          <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">{fmtUsd(p.trade_value_usd)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Energy Tab (with country comparison) ─────────────────────────────────────

function EnergyTab() {
  const [energyByCountry, setEnergyByCountry] = useState<EnergyByCountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [summary, setSummary] = useState<EnergySummary | null>(null);
  const [countrySummary, setCountrySummary] = useState<EnergySummary | null>(null);

  // Fetch all-corridor summary + per-country breakdown
  useEffect(() => {
    // Overall summary
    fetch("/api/energy/plants")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.summary) setSummary(d.summary as EnergySummary); })
      .catch(() => {});

    // Per-country stats
    Promise.allSettled(
      COUNTRIES.map((iso) =>
        fetch(`/api/energy/plants?country=${iso}`)
          .then((r) => r.ok ? r.json() : null)
          .then((d) => ({
            country: COUNTRY_NAMES[iso],
            plants: d?.summary?.total_plants ?? 0,
            capacity: d?.summary?.total_capacity_mw ?? 0,
          }))
      ),
    ).then((results) => {
      const data = results
        .filter((r): r is PromiseFulfilledResult<EnergyByCountry> => r.status === "fulfilled")
        .map((r) => r.value);
      setEnergyByCountry(data);
    });
  }, []);

  // Fetch country-specific fuel breakdown
  useEffect(() => {
    if (selectedCountry === "all") {
      setCountrySummary(null);
      return;
    }
    fetch(`/api/energy/plants?country=${selectedCountry}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.summary) setCountrySummary(d.summary as EnergySummary); })
      .catch(() => {});
  }, [selectedCountry]);

  const activeSummary = selectedCountry === "all" ? summary : countrySummary;
  const fuelData = activeSummary?.by_fuel
    ? Object.entries(activeSummary.by_fuel)
        .map(([fuel, count]) => ({ name: fuel.charAt(0).toUpperCase() + fuel.slice(1), value: Number(count) || 0 }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <div className="space-y-5">
      <Selector label="Country" value={selectedCountry} onChange={setSelectedCountry}
        options={[{ value: "all", label: "All Corridor" }, ...COUNTRIES.map((iso) => ({ value: iso, label: COUNTRY_NAMES[iso] }))]} />

      {/* KPIs */}
      {activeSummary && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">Plants</div>
            <div className="text-xl font-bold tabular-nums">{activeSummary.total_plants}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">Capacity</div>
            <div className="text-xl font-bold tabular-nums">{fmtNum(activeSummary.total_capacity_mw)} MW</div>
          </div>
        </div>
      )}

      {/* Country comparison chart */}
      {energyByCountry.length > 0 && selectedCountry === "all" && (
        <ChartSection title="Capacity by Country (MW)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={energyByCountry}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip formatter={(v) => `${fmtNum(v)} MW`} />
              <Bar dataKey="capacity" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      {/* Fuel mix pie */}
      {fuelData.length > 0 && (
        <ChartSection title={`Generation Mix${selectedCountry !== "all" ? ` — ${COUNTRY_NAMES[selectedCountry]}` : ""}`}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={fuelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {fuelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      {/* Country comparison table */}
      {energyByCountry.length > 0 && (
        <ChartSection title="Country Comparison">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-2 py-1.5 text-left font-medium">Country</th>
                  <th className="px-2 py-1.5 text-right font-medium">Plants</th>
                  <th className="px-2 py-1.5 text-right font-medium">Capacity (MW)</th>
                </tr>
              </thead>
              <tbody>
                {energyByCountry.map((r) => (
                  <tr key={r.country} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-1.5 font-medium">{r.country}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.plants}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(r.capacity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartSection>
      )}
    </div>
  );
}

// ── Shared UI helpers ────────────────────────────────────────────────────────

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[12px] font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Selector({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground">{label}:</span>
      <select className="rounded border border-border bg-background px-2 py-1 text-[12px]" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
