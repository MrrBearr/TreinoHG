import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { FAB } from "@/components/layout/FAB";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { createClient } from "@/lib/supabase/server";

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
    // `redirect()` throws a special error that must propagate; everything
    // else is logged and we render the shell with the default theme so the
    // app does not white-screen on transient Supabase issues.
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
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
