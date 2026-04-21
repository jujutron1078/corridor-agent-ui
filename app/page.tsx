import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  TrendingUp,
  Users,
  BriefcaseBusiness,
  Home as HomeIcon,
  Database,
  Bot,
} from "lucide-react";

import { TopNavbar } from "@/components/top-navbar";

const timeline = [
  { year: "2020", label: "ALCoMA Treaty Signed" },
  { year: "2024", label: "Spatial Development Study Complete" },
  { year: "2025-26", label: "EU Business Forum and Financing Window" },
  { year: "2026", label: "Construction Start" },
  { year: "2030", label: "Full Corridor Operational" },
];

const highlights = [
  { title: "Economic value from ~$6.8B complementary investments", value: "$16B", icon: TrendingUp },
  { title: "Direct jobs created across corridor nations", value: "70K+", icon: BriefcaseBusiness },
  { title: "Indirect employment and supply chain jobs", value: "160K", icon: Users },
  { title: "Construction start - targeting 2030 completion", value: "2026", icon: MapPin },
];

const flowSteps = [
  {
    icon: HomeIcon,
    title: "Home",
    description: "Introduces the corridor story and headline KPIs.",
  },
  {
    icon: Database,
    title: "Data Overview",
    description: "Holds all analytical domain pages and datasets.",
  },
  {
    icon: Bot,
    title: "Agent",
    description: "Chat-driven exploration with contextual map overlays.",
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f5eb]">
      <TopNavbar />

      <main className="relative mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-6">
        <section className="corridor-fade-in relative overflow-hidden rounded-xl border border-[#ead9b4] bg-gradient-to-br from-[#f4efde] via-[#f6ecd0] to-[#fbe6c2] p-6 shadow-[0_14px_30px_rgba(102,79,20,0.08)] lg:p-8">
          {/* Decorative Africa silhouette watermark inside the hero */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-10 h-[520px] w-[520px] opacity-[0.22] sm:-right-16 sm:h-[640px] sm:w-[640px] lg:-right-4 lg:-top-16 lg:h-[780px] lg:w-[780px]"
            style={{
              maskImage: "url(/africa-silhouette.svg)",
              WebkitMaskImage: "url(/africa-silhouette.svg)",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              backgroundImage:
                "radial-gradient(circle at 35% 40%, #ef7c00 0%, #d26a00 55%, #a16e2f 100%)",
            }}
          />
          <div className="relative z-10 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#a16e2f]">
              Abidjan-Lagos Corridor
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[#21190d] lg:text-6xl">
              West Africa&apos;s <span className="text-[#ec7a00]">Economic Gateway</span> Unlocked
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#5c4c33]">
              The Abidjan-Lagos Corridor connects five coastal nations across 1,028 km of highway, unlocking
              anchor investments in logistics, agro-processing, renewable energy, and manufacturing - powered by
              harmonized policies under the ALCoMA Treaty.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/overview/interactive-map"
                className="inline-flex items-center gap-2 rounded-md bg-[#ef7c00] px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:scale-[1.02] hover:bg-[#de7200]"
              >
                Explore The Map
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-md border border-[#c78d34] px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#7a4c0a] transition hover:scale-[1.02] hover:bg-[#fff3d8]"
              >
                View Investment Wall
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {highlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="corridor-card-float rounded-xl border border-[#ecdcb7] bg-white/70 p-4 backdrop-blur-[3px]"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <Icon className="mb-2 h-4 w-4 text-[#ef7c00]" />
                  <p className="text-3xl font-semibold text-[#d66900]">{item.value}</p>
                  <p className="text-xs text-[#7a6849]">{item.title}</p>
                </div>
              );
            })}
          </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-xl border border-[#e6d6b4] bg-white/80 p-5 backdrop-blur-[2px]">
            <h2 className="text-lg font-semibold text-[#2d2417]">Data Overview Sections</h2>
            <p className="mt-1 text-sm text-[#685b40]">
              All intelligence sections are grouped under Data Overview.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {[
                "Interactive Map",
                "Manufacturing",
                "Policy",
                "Stakeholders",
                "Tourism",
                "Agriculture",
                "Infrastructure",
                "Economy",
                "Projects",
                "Opportunities",
                "Investor Dashboard",
              ].map((tag) => (
                <span key={tag} className="rounded-full border border-[#dcc9a1] bg-[#fffaf0] px-2.5 py-1 text-[#6a532d]">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#e6d6b4] bg-white/80 p-5 backdrop-blur-[2px]">
            <h2 className="text-lg font-semibold text-[#2d2417]">Operational Flow</h2>
            <ol className="relative mt-4 space-y-3 pl-[1.1rem]">
              {/* vertical connector line running behind the step numbers */}
              <span
                aria-hidden="true"
                className="absolute left-[1.1rem] top-4 bottom-4 w-px bg-gradient-to-b from-[#e3c287] via-[#d4a55e] to-[#e3c287]"
              />
              {flowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="relative flex items-start gap-3">
                    <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4b175] bg-[#fff6e5] text-[13px] font-semibold text-[#d17a08] shadow-[0_2px_6px_rgba(209,122,8,0.18)]">
                      {index + 1}
                    </div>
                    <div className="flex flex-1 items-start justify-between rounded-lg border border-[#e8d8b5] bg-[#fffbf3]/95 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-[#3d3420]">{step.title}</p>
                        <p className="text-xs leading-relaxed text-[#6a5c40]">{step.description}</p>
                      </div>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#c18432]" />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="rounded-lg border-y-2 border-[#c9a500] bg-[#f9f6ed]/90 py-6 backdrop-blur-[2px]">
          <ul className="grid gap-2 px-4 text-center sm:grid-cols-[repeat(9,minmax(0,1fr))] sm:px-6">
            {timeline.map((item, idx) => (
              <li key={item.year} className="contents">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#d26a00]">{item.year}</p>
                  <p className="text-xs text-[#5f543e]">{item.label}</p>
                </div>
                {idx < timeline.length - 1 && (
                  <div className="hidden items-center justify-center sm:flex">
                    <div className="h-px w-full bg-gradient-to-r from-[#d3b157] to-[#e28616]" />
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#d37f18]" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="relative border-t border-[#e0d6bf] bg-[#f5f0e2]/95 py-4 text-center text-xs text-[#7a6849] backdrop-blur-[2px]">
        Platform developed for the EU-Africa Business Forum - Abidjan-Lagos Corridor - ALCoMA and ECOWAS Framework
      </footer>
    </div>
  );
}
