import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  searchParams: {
    error?: string;
    error_code?: string;
    error_description?: string;
    code?: string;
  };
}

/**
 * Root entry point.
 *
 * Supabase email links sometimes redirect back to the project's "Site URL"
 * (configured in the dashboard) with error params attached, e.g.:
 *   /?error=access_denied&error_code=otp_expired&error_description=...
 * We forward those to /auth-error so the user sees a friendly UI instead of
 * a confusing redirect loop.
 *
 * If a `code` lands here it usually means the redirect URL allowlist is
 * misconfigured — forward to /auth/callback to recover the session anyway.
 */
export default async function HomePage({ searchParams }: PageProps) {
  if (searchParams.error || searchParams.error_code) {
    const params = new URLSearchParams();
    if (searchParams.error) params.set("error", searchParams.error);
    if (searchParams.error_code)
      params.set("error_code", searchParams.error_code);
    if (searchParams.error_description)
      params.set("error_description", searchParams.error_description);
    redirect(`/auth-error?${params.toString()}`);
  }

  if (searchParams.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(searchParams.code)}`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  redirect("/login");
}
