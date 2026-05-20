import { Sparkles, Flame, Activity, Target } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { CoachChat } from "@/components/insights/CoachChat";
import { DailyInsightBlock } from "@/components/insights/DailyInsightBlock";
import { getDaySummary, getProfile } from "@/lib/queries";
import { toDateKey } from "@/lib/utils";

export const metadata = { title: "Coach IA · TreinoHG" };

export default async function InsightsPage() {
  const dateKey = toDateKey();
  const [profile, summary] = await Promise.all([
    getProfile(),
    getDaySummary(dateKey),
  ]);

  const target = profile?.calorie_target ?? 0;
  const status = (() => {
    if (!target) return null;
    const tol = target * 0.05;
    if (summary.net_kcal > target + tol)
      return { label: "Acima da meta", tone: "text-warning" };
    if (summary.net_kcal < target - tol)
      return { label: "Abaixo da meta", tone: "text-muted-foreground" };
    return { label: "Na meta", tone: "text-success" };
  })();

  return (
    <PageContainer>
      <Header title="Coach IA" subtitle="Insights e orientação personalizada" />

      <div className="space-y-5 animate-fade-in">
        <Card className="relative overflow-hidden border-accent/30 bg-gradient-to-br from-accent/15 via-card to-card p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-foreground text-background shadow-lg">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight">
                Seu coach particular
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Análises do dia, ajustes de macros, dicas de treino e tudo o que
                precisar.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat
            icon={Flame}
            label="Hoje"
            value={`${summary.consumed_kcal}`}
            unit="kcal"
          />
          <MiniStat
            icon={Activity}
            label="Saldo"
            value={`${summary.net_kcal}`}
            unit="kcal"
          />
          <MiniStat
            icon={Target}
            label="Status"
            value={status?.label ?? "—"}
            tone={status?.tone}
          />
        </div>

        <DailyInsightBlock date={dateKey} />

        <div>
          <h3 className="mb-2 font-display text-base font-semibold">
            Pergunte ao coach
          </h3>
          <CoachChat />
        </div>
      </div>
    </PageContainer>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  tone?: string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`stat-number text-base ${tone ?? ""}`}>{value}</div>
      {unit && <div className="text-[10px] text-muted-foreground">{unit}</div>}
    </Card>
  );
}
