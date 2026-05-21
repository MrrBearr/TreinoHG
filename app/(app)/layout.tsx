import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { FAB } from "@/components/layout/FAB";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { createClient } from "@/lib/supabase/server";

/**
 * The (app) group is fully authenticated. Every page reads cookies/session
 * via Supabase, so it MUST be dynamically rendered. Setting this on the
 * layout propagates to every child route in the group.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    theme = (profile?.theme as string) ?? null;
  } catch (err) {
    // Next.js redirect() throws a special error — let it propagate
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    // Everything else: log but don't crash the layout shell
    console.error("[(app)/layout] auth/profile error:", err);
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
