import { Suspense } from "react";
import { ChatPageShell } from "@/components/chat-page-shell";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChatPageShell />
    </Suspense>
  );
}
