import { NextRequest, NextResponse } from "next/server";

/**
 * Injects X-API-Key header into backend proxy requests.
 * The key is server-only (never sent to the browser).
 */
export function middleware(request: NextRequest) {
  const apiKey = process.env.BACKEND_API_KEY;

  if (!apiKey) {
    return NextResponse.next();
  }

  // Clone headers and add API key
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-API-Key", apiKey);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/api/:path*", "/workspace/:path*"],
};
