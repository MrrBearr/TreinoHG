import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { FAB } from "@/components/layout/FAB";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { createClient } from "@/lib/supabase/server";
import { isNextControlError } from "@/lib/next-control-errors";

/**
 * Authenticated route group is ALWAYS dynamic. Every page rendered under
 * this layout reads `cookies()` (Supabase session), so static optimization
 * is impossible by design. We declare this explicitly instead of relying on
 * implicit dynamic-ness via `cookies()` calls — that has bitten us before
 * when an error swallow accidentally let Next prerender a logged-out shell.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let theme: string | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("theme")
      .eq("user_id", user.id)
      .maybeSingle();
    theme = (profile?.theme as string | null) ?? null;
  } catch (err) {
    // Next.js uses thrown sentinels (redirect, notFound, dynamic-usage,
    // not-found) for control flow. We MUST re-throw those — otherwise we
    // silently break routing and let Next produce empty static renders
    // for authenticated pages.
    if (isNextControlError(err)) throw err;
    console.error("[(app)/layout] failed to load profile theme", err);
  }

  return (
    <>
      <ThemeSync theme={theme} />
      <main className="relative">{children}</main>
      <FAB />
      <BottomNav />
    </>
  );
}
