import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + email-confirmation callback.
 *
 * Handles three incoming shapes:
 *   1. ?code=...        Successful PKCE / email-link verification —
 *                       exchange for a session, redirect to `next` or /dashboard.
 *   2. ?error=...       Supabase failed to verify the link (expired OTP,
 *                       access denied, etc.) — forward to /auth-error with
 *                       the diagnostic params so the user sees a clean UI.
 *   3. neither          Fall back to /auth-error so we never leave the user
 *                       on a blank screen.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const error = params.get("error");
  const errorCode = params.get("error_code");
  const errorDescription = params.get("error_description");
  if (error || errorCode) {
    const dest = new URL("/auth-error", url.origin);
    if (error) dest.searchParams.set("error", error);
    if (errorCode) dest.searchParams.set("error_code", errorCode);
    if (errorDescription)
      dest.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(dest);
  }

  const code = params.get("code");
  const next = params.get("next") ?? "/dashboard";
  if (!code) {
    return NextResponse.redirect(
      new URL("/auth-error?error_code=missing_code", url.origin),
    );
  }

  const supabase = createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );
  if (exchangeError) {
    const dest = new URL("/auth-error", url.origin);
    dest.searchParams.set("error_code", "exchange_failed");
    dest.searchParams.set("error_description", exchangeError.message);
    return NextResponse.redirect(dest);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
