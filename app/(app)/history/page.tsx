import { Calendar } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { HistoryList } from "@/components/history/HistoryList";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { getProfile, getRecentDays } from "@/lib/queries";

export const metadata = { title: "Histórico · TreinoHG" };

export default async function HistoryPage() {
  const [profile, days] = await Promise.all([getProfile(), getRecentDays(30)]);
  const target = profile?.calorie_target ?? 2000;

  const active = days.filter((d) => d.consumed_kcal > 0 || d.workout_count > 0);
  const totalKcal = active.reduce((s, d) => s + d.consumed_kcal, 0);
  const totalBurn = active.reduce((s, d) => s + d.burned_kcal, 0);
  const avgKcal =
    active.length > 0 ? Math.round(totalKcal / active.length) : 0;
  const streak = computeStreak(days);

  return (
    <PageContainer>
      <Header
        title="Histórico"
        subtitle="Seus últimos 30 dias"
      />
      <div className="space-y-5 animate-fade-in stagger">
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Dias ativos
            </div>
            <div className="stat-number text-xl">{active.length}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Sequência
            </div>
            <div className="stat-number text-xl">{streak}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Média kcal
            </div>
            <div className="stat-number text-xl">
              {formatNumber(avgKcal)}
            </div>
          </Card>
        </div>

        <HistoryList days={days} target={target} />
      </div>
    </PageContainer>
  );
}

function computeStreak(days: { date: string; consumed_kcal: number; workout_count: number }[]) {
  // days is ordered desc (most recent first)
  let streak = 0;
  for (const d of days) {
    if (d.consumed_kcal > 0 || d.workout_count > 0) streak++;
    else break;
  }
  return streak;
}
