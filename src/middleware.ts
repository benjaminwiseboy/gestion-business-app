// Intentionally empty: anonymous sign-in is bootstrapped client-side in
// <Providers> (src/app/providers.tsx) to avoid blocking page rendering on
// Edge runtime cold starts and Supabase Auth round-trips during development.
//
// When proper email/OTP auth lands in V1, restore a middleware that refreshes
// the session and gates protected routes.

import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
