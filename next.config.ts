import type { NextConfig } from "next";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
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
