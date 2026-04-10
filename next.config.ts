import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8001";
    const langgraph = process.env.LANGGRAPH_BACKEND_URL ?? "http://127.0.0.1:2024";
    return [
      // LangGraph SDK endpoints — proxy through Next.js to avoid CORS/PNA issues
      { source: "/threads/:path*", destination: `${langgraph}/threads/:path*` },
      { source: "/runs/:path*", destination: `${langgraph}/runs/:path*` },
      { source: "/assistants/:path*", destination: `${langgraph}/assistants/:path*` },
      { source: "/ok", destination: `${langgraph}/ok` },
      { source: "/info", destination: `${langgraph}/info` },
      // Custom FastAPI endpoints
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/workspace/:path*", destination: `${backend}/workspace/:path*` },
    ];
  },
};

export default nextConfig;
