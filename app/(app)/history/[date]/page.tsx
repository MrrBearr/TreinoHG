import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Flame,
  Activity,
  Target,
  TrendingDown,
  Dumbbell,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalorieRing } from "@/components/dashboard/CalorieRing";
import { StatChip } from "@/components/dashboard/StatChip";
import { MacroBars } from "@/components/dashboard/MacroBars";
import {
  CopyDayButton,
  DeleteMealButton,
  DeleteWorkoutButton,
  DeleteEntryButton,
} from "@/components/history/DayDetailActions";
import {
  getDayMeals,
  getDayWorkouts,
  getDaySummary,
  getProfile,
} from "@/lib/queries";
import { addDays, fromDateKey, toDateKey, formatKcal, formatNumber } from "@/lib/utils";
import { MEAL_TYPES, WORKOUT_TYPES } from "@/lib/constants";

interface Props {
  params: { date: string };
}

export default async function DayDetailPage({ params }: Props) {
  const dateKey = params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) notFound();

  const [profile, { meals, entries }, workouts, summary] = await Promise.all([
    getProfile(),
    getDayMeals(dateKey),
    getDayWorkouts(dateKey),
    getDaySummary(dateKey),
  ]);

  const target = profile?.calorie_target ?? 2000;
  const proteinTarget = profile?.protein_target_g ?? 130;
  const carbsTarget = profile?.carbs_target_g ?? 220;
  const fatTarget = profile?.fat_target_g ?? 70;

  const date = fromDateKey(dateKey);
  const prev = toDateKey(addDays(date, -1));
  const next = toDateKey(addDays(date, 1));
  const isToday = dateKey === toDateKey();
  const dateLabel = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <PageContainer>
      <Header title="Detalhe do dia" showBack />

      <div className="space-y-5 animate-fade-in stagger">
        <div className="flex items-center justify-between">
          <Link
            href={`/history/${prev}`}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-secondary"
            aria-label="Dia anterior"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {isToday ? "Hoje" : ""}
            </div>
            <div className="font-display text-base font-semibold capitalize">
              {dateLabel}
            </div>
          </div>
          <Link
            href={`/history/${next}`}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-secondary"
            aria-label="Próximo dia"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Card className="p-5">
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
            <StatChip icon={Target} label="Meta" value={target} unit="kcal" />
            <StatChip
              icon={Activity}
              label="Saldo"
              value={summary.net_kcal}
              unit="kcal"
            />
          </div>
          <div className="mt-5 border-t border-border/60 pt-4">
            <MacroBars
              protein={{ current: summary.protein_g, target: proteinTarget }}
              carbs={{ current: summary.carbs_g, target: carbsTarget }}
              fat={{ current: summary.fat_g, target: fatTarget }}
            />
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default">
            <Link href={`/meals/add?date=${dateKey}`}>
              <Plus /> Refeição
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/workouts/add?date=${dateKey}`}>
              <Plus /> Treino
            </Link>
          </Button>
          <CopyDayButton date={dateKey} />
        </div>

        {/* Meals section */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Refeições</h2>
          {meals.length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground">
              Nenhuma refeição registrada nesse dia.
            </Card>
          ) : (
            meals.map((m) => {
              const meta =
                MEAL_TYPES.find((t) => t.value === m.meal_type) ??
                MEAL_TYPES[6];
              const mealEntries = entries.filter((e) => e.meal_id === m.id);
              const tot = mealEntries.reduce(
                (acc, e) => ({
                  c: acc.c + Number(e.calories),
                  p: acc.p + Number(e.protein_g),
                  ca: acc.ca + Number(e.carbs_g),
                  f: acc.f + Number(e.fat_g),
                }),
                { c: 0, p: 0, ca: 0, f: 0 },
              );
              return (
                <Card key={m.id} id={`meal-${m.id}`} className="overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <span className="text-2xl">{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-tight">
                        {m.name || meta.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {meta.label}
                        {m.time ? ` · ${m.time.slice(0, 5)}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="stat-number text-sm">
                        {formatKcal(tot.c)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        P{Math.round(tot.p)} · C{Math.round(tot.ca)} · G
                        {Math.round(tot.f)}
                      </div>
                    </div>
                    <DeleteMealButton meal_id={m.id} date={dateKey} />
                  </div>
                  {m.photo_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.photo_url}
                      alt="Foto"
                      className="h-40 w-full object-cover"
                    />
                  )}
                  {mealEntries.length > 0 && (
                    <div className="divide-y divide-border border-t border-border bg-secondary/30">
                      {mealEntries.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium leading-tight">
                              {e.name}
                              {e.source === "ai" && (
                                <Badge
                                  variant="default"
                                  className="ml-2 text-[10px]"
                                >
                                  IA
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {e.quantity || "—"} ·{" "}
                              {formatNumber(Number(e.calories))} kcal
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-muted-foreground">
                            P{Math.round(Number(e.protein_g))} C
                            {Math.round(Number(e.carbs_g))} G
                            {Math.round(Number(e.fat_g))}
                          </div>
                          <DeleteEntryButton entry_id={e.id} date={dateKey} />
                        </div>
                      ))}
                    </div>
                  )}
                  {m.notes && (
                    <div className="border-t border-border bg-secondary/30 px-4 py-2 text-xs text-muted-foreground">
                      {m.notes}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </section>

        {/* Workouts section */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Treinos</h2>
          {workouts.length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground">
              Nenhum treino registrado nesse dia.
            </Card>
          ) : (
            workouts.map((w) => {
              const meta = WORKOUT_TYPES.find((t) => t.value === w.workout_type);
              return (
                <Card
                  key={w.id}
                  id={`workout-${w.id}`}
                  className="flex items-center gap-3 p-4"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-500">
                    <Dumbbell className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-tight">
                      {w.name || meta?.label || w.workout_type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {w.duration_min} min
                      {w.intensity ? ` · ${w.intensity}` : ""}
                      {w.treadmill_min ? ` · esteira ${w.treadmill_min}min` : ""}
                    </div>
                    {w.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {w.notes}
                      </div>
                    )}
                  </div>
                  <div className="stat-number text-sm">
                    -{formatNumber(w.calories_burned)}{" "}
                    <span className="text-[10px] text-muted-foreground">
                      kcal
                    </span>
                  </div>
                  <DeleteWorkoutButton workout_id={w.id} date={dateKey} />
                </Card>
              );
            })
          )}
        </section>
      </div>
    </PageContainer>
  );
}
