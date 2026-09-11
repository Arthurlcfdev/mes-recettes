import { NextResponse } from "next/server";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "./lib/auth";

export async function middleware(req) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = await verifySessionCookieValue(cookie);
  if (valid) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

// Whitelist: only these paths require a session. /login and /api/auth/*
// stay outside the matcher so they remain reachable while unauthenticated.
export const config = {
  matcher: ["/", "/api/recipes/:path*", "/api/scrape"],
};
