import { Suspense } from "react";

import { ChatPageShell } from "@/components/chat-page-shell";
import { TopNavbar } from "@/components/top-navbar";

export default function AgentPage() {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <TopNavbar />
      <div className="h-[calc(100vh-56px)]">
        <Suspense fallback={null}>
          <ChatPageShell className="h-full" />
        </Suspense>
      </div>
    </div>
  );
}
