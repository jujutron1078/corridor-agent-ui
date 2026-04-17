import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const apiKey = process.env.BACKEND_API_KEY;

  if (
    apiKey &&
    (request.nextUrl.pathname.startsWith("/api/") ||
      request.nextUrl.pathname.startsWith("/workspace/"))
  ) {
    const headers = new Headers(request.headers);
    headers.set("X-API-Key", apiKey);
    return NextResponse.rewrite(request.nextUrl, { headers });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/workspace/:path*"],
};
