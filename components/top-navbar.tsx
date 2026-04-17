"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Data Overview", href: "/overview" },
  { label: "Agent", href: "/agent" },
];

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b border-amber-700/60 bg-[linear-gradient(90deg,#ef7c00_0%,#ff8f0f_45%,#f47d00_100%)] text-white shadow-[0_6px_20px_rgba(239,124,0,0.35)]">
      <div className="mx-auto flex h-14 w-full max-w-[1500px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link href="/" className="text-sm font-semibold tracking-wide">
            Abidjan-Lagos Corridor
          </Link>
        </div>
        <nav className="flex items-center gap-1 rounded-md bg-white/12 p-1">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-300",
                  active
                    ? "bg-white/90 text-[#cb5c00] shadow-sm"
                    : "text-white/90 hover:bg-white/20 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-4 text-[11px] font-semibold uppercase tracking-wide lg:flex">
          <span>~1,028 km</span>
          <span>$16B</span>
          <span>5 Countries</span>
        </div>
      </div>
    </header>
  );
}
