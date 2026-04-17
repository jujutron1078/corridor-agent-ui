import { Suspense } from "react";

import { InteractiveMapPage } from "@/components/interactive-map-page";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-black text-white/40">
          Loading dashboard...
        </div>
      }
    >
      <InteractiveMapPage />
    </Suspense>
  );
}
