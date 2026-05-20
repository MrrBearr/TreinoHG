import Link from "next/link";
import { ChevronRight, Dumbbell, Timer, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WORKOUT_TYPES } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import type { Workout } from "@/types/database";

export function WorkoutSummary({
  workouts,
  date,
}: {
  workouts: Workout[];
  date: string;
}) {
  const totalMin = workouts.reduce((s, w) => s + (w.duration_min ?? 0), 0);
  const totalKcal = workouts.reduce((s, w) => s + (w.calories_burned ?? 0), 0);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/10 text-orange-500">
            <Dumbbell className="h-4 w-4" />
          </span>
          <h3 className="font-semibold">Treinos</h3>
          <Badge variant="secondary">{workouts.length}</Badge>
        </div>
        <Link
          href={`/history/${date}`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Ver tudo
        </Link>
      </div>

      {workouts.length === 0 ? (
        <div className="px-5 pb-5 pt-1">
          <p className="text-sm text-muted-foreground">
            Nenhum treino registrado hoje.
          </p>
          <Link
            href="/workouts/add"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Registrar treino →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 px-5 pb-3">
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Timer className="h-3 w-3" /> Duração
              </div>
              <div className="stat-number text-lg">
                {formatNumber(totalMin)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  min
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Flame className="h-3 w-3" /> Queimadas
              </div>
              <div className="stat-number text-lg">
                {formatNumber(totalKcal)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  kcal
                </span>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {workouts.map((w) => {
              const meta = WORKOUT_TYPES.find((t) => t.value === w.workout_type);
              return (
                <Link
                  key={w.id}
                  href={`/history/${date}#workout-${w.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500/10 text-orange-500">
                    <Dumbbell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-tight">
                      {w.name || meta?.label || w.workout_type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {w.duration_min} min · {w.intensity ?? "-"}
                    </div>
                  </div>
                  <div className="stat-number text-sm">
                    -{formatNumber(w.calories_burned ?? 0)} kcal
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
