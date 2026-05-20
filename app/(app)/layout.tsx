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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme, onboarded")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <ThemeSync theme={profile?.theme ?? null} />
      <main className="relative">{children}</main>
      <FAB />
      <BottomNav />
    </>
  );
}
