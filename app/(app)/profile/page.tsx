import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut, Sparkles, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ThemeSelector } from "@/components/profile/ThemeSelector";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/queries";

export const metadata = { title: "Perfil · TreinoHG" };

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  const initials =
    (profile?.display_name ?? user.email ?? "U")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <PageContainer>
      <Header title="Perfil" subtitle="Seus dados e preferências" />
      <div className="space-y-5 animate-fade-in">
        <Card className="flex items-center gap-4 p-5">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary text-primary-foreground font-display text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-semibold leading-tight">
              {profile?.display_name || "Sem nome"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {user.email}
            </div>
          </div>
        </Card>

        {profile?.calorie_target && (
          <Card className="grid grid-cols-4 divide-x divide-border p-0">
            <Stat label="Meta" value={profile.calorie_target} unit="kcal" />
            <Stat label="Prot" value={profile.protein_target_g ?? 0} unit="g" />
            <Stat label="Carb" value={profile.carbs_target_g ?? 0} unit="g" />
            <Stat label="Gord" value={profile.fat_target_g ?? 0} unit="g" />
          </Card>
        )}

        <ThemeSelector current={profile?.theme ?? "dark"} />

        <ProfileForm profile={profile} />

        <Link
          href="/insights"
          className="block transition-transform active:scale-[0.99]"
        >
          <Card className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Coach IA</div>
              <div className="text-xs text-muted-foreground">
                Tire dúvidas e receba ajustes
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-sm">
              Versão{" "}
              <span className="font-mono">
                {process.env.npm_package_version ?? "0.1.0"}
              </span>
            </div>
            <LogoutButton />
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="px-3 py-4 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="stat-number text-base">{value}</div>
      {unit && <div className="text-[10px] text-muted-foreground">{unit}</div>}
    </div>
  );
}
