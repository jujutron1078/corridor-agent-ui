import Link from "next/link";
import { ArrowRight, ChevronRight, MapPin, TrendingUp, Users, BriefcaseBusiness, Sparkles } from "lucide-react";

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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8f5eb]">
      <TopNavbar />

      <main className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-6">
        <section className="corridor-fade-in grid gap-5 rounded-xl border border-[#ead9b4] bg-[#f4efde] p-6 shadow-[0_14px_30px_rgba(102,79,20,0.08)] lg:grid-cols-[1.3fr_1fr] lg:p-8">
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
                  className="corridor-card-float rounded-xl border border-[#ecdcb7] bg-white/85 p-4"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <Icon className="mb-2 h-4 w-4 text-[#ef7c00]" />
                  <p className="text-3xl font-semibold text-[#d66900]">{item.value}</p>
                  <p className="text-xs text-[#7a6849]">{item.title}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-xl border border-[#e6d6b4] bg-white/80 p-5">
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

          <div className="rounded-xl border border-[#e6d6b4] bg-white/80 p-5">
            <h2 className="text-lg font-semibold text-[#2d2417]">Operational Flow</h2>
            <div className="mt-4 grid gap-3">
              {[
                "Home introduces the corridor story and KPIs.",
                "Data Overview holds all analytical domain pages.",
                "Agent focuses on chats with map overlays.",
              ].map((item, index) => (
                <div key={item} className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-[#e8d8b5] bg-[#fffbf3] px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4b175] bg-[#fff6e5] font-semibold text-[#d17a08]">
                      {index + 1}
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-sm text-[#5f543e]">{item}</span>
                      <Sparkles className="h-4 w-4 text-[#d09a46]" />
                    </div>
                  </div>
                  {index < 2 && (
                    <div className="pointer-events-none absolute -bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center text-[#d09a46]">
                      <span className="h-3 w-px bg-[#d9bf8f]" />
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border-y-2 border-[#c9a500] bg-[#f9f6ed] py-6">
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

      <footer className="border-t border-[#e0d6bf] bg-[#f5f0e2] py-4 text-center text-xs text-[#7a6849]">
        Platform developed for the EU-Africa Business Forum - Abidjan-Lagos Corridor - ALCoMA and ECOWAS Framework
      </footer>
    </div>
  );
}
