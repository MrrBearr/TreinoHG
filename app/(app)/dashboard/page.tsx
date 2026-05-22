import { Suspense } from "react";
import { Flame, TrendingDown, Target, Activity } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { CalorieRing } from "@/components/dashboard/CalorieRing";
import { StatChip } from "@/components/dashboard/StatChip";
import { MacroBars } from "@/components/dashboard/MacroBars";
import { MealsSummary } from "@/components/dashboard/MealsSummary";
import { WorkoutSummary } from "@/components/dashboard/WorkoutSummary";
import { MotivationCard } from "@/components/dashboard/MotivationCard";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { OnboardingPrompt } from "@/components/dashboard/OnboardingPrompt";
import {
  getProfile,
  getDayMeals,
  getDayWorkouts,
  getOrCreateDay,
  getDaySummary,
} from "@/lib/queries";
import { toDateKey } from "@/lib/utils";
import { getDailyPhrase } from "@/lib/motivational-phrases";

export default async function DashboardPage() {
  const dateKey = toDateKey();
  const [profile, _day, { meals, entries }, workouts, summary] =
    await Promise.all([
      getProfile(),
      getOrCreateDay(dateKey),
      getDayMeals(dateKey),
      getDayWorkouts(dateKey),
      getDaySummary(dateKey),
    ]);

  const target = profile?.calorie_target ?? 2000;
  const proteinTarget = profile?.protein_target_g ?? 130;
  const carbsTarget = profile?.carbs_target_g ?? 220;
  const fatTarget = profile?.fat_target_g ?? 70;

  const phrase = getDailyPhrase(dateKey);
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return "Boa madrugada";
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();
  const firstName = (profile?.display_name ?? "").split(" ")[0] || "atleta";

  return (
    <PageContainer>
      <Header
        title={`${greeting}, ${firstName}`}
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      />

      <div className="space-y-5 animate-fade-in stagger">
        {!profile?.onboarded && <OnboardingPrompt />}

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft-lg">
          <CalorieRing
            consumed={summary.consumed_kcal}
            burned={summary.burned_kcal}
            target={target}
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatChip
              icon={Flame}
              label="Consumidas"
              value={summary.consumed_kcal}
              unit="kcal"
              tone="primary"
            />
            <StatChip
              icon={TrendingDown}
              label="Queimadas"
              value={summary.burned_kcal}
              unit="kcal"
              tone="warning"
            />
            <StatChip
              icon={Target}
              label="Meta"
              value={target}
              unit="kcal"
            />
            <StatChip
              icon={Activity}
              label="Saldo"
              value={summary.net_kcal}
              unit="kcal"
              tone={
                summary.net_kcal > target
                  ? "warning"
                  : summary.net_kcal >= target * 0.95
                    ? "success"
                    : "default"
              }
            />
          </div>
          <div className="mt-5 border-t border-border/60 pt-4">
            <MacroBars
              protein={{ current: summary.protein_g, target: proteinTarget }}
              carbs={{ current: summary.carbs_g, target: carbsTarget }}
              fat={{ current: summary.fat_g, target: fatTarget }}
            />
          </div>
        </section>

        <QuickActions />

        <Suspense>
          <AIInsightCard date={dateKey} />
        </Suspense>

        <MealsSummary meals={meals} entries={entries} date={dateKey} />

        <WorkoutSummary workouts={workouts} date={dateKey} />

        <MotivationCard phrase={phrase} />
      </div>
    </PageContainer>
  );
}
