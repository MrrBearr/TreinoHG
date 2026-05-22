import Link from "next/link";
import { ChevronRight, Flame, Dumbbell, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  dayOfMonthBR,
  formatBR,
  formatNumber,
  isTodayKey,
  weekdayLongBR,
} from "@/lib/utils";
import type { DaySummary } from "@/types";

export function HistoryList({
  days,
  target,
}: {
  days: DaySummary[];
  target: number;
}) {
  return (
    <div className="space-y-2">
      {days.map((d) => {
        const isToday = isTodayKey(d.date);
        // Both "qua" (column) and "quarta-feira" (row) come from BR-aware
        // formatters so we never display a day that is off-by-one from the
        // actual calendar day in Brazil.
        const weekdayShort = formatBR(d.date, { weekday: "short" });
        const status = statusFor(d.net_kcal, target);
        const empty =
          d.consumed_kcal === 0 && d.workout_count === 0 && d.meal_count === 0;
        return (
          <Link
            key={d.date}
            href={`/history/${d.date}`}
            className="block transition-transform active:scale-[0.99]"
          >
            <Card className="flex items-center gap-3 p-3">
              <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-xl bg-secondary p-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {weekdayShort.replace(".", "").slice(0, 3)}
                </span>
                <span className="stat-number text-lg leading-none">
                  {dayOfMonthBR(d.date)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold capitalize">
                    {weekdayLongBR(d.date)}
                  </div>
                  {isToday && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Hoje
                    </span>
                  )}
                </div>
                {empty ? (
                  <div className="text-xs text-muted-foreground">
                    Sem registros
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {formatNumber(d.consumed_kcal)} kcal
                    </span>
                    <span className="flex items-center gap-1">
                      <UtensilsCrossed className="h-3 w-3" />
                      {d.meal_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {d.workout_count} · {d.workout_minutes}min
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {!empty && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.classes}`}
                  >
                    {status.label}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function statusFor(net: number, target: number) {
  if (target <= 0)
    return { label: "—", classes: "bg-secondary text-muted-foreground" };
  const tol = target * 0.05;
  if (net > target + tol)
    return { label: "Acima", classes: "bg-warning/15 text-warning" };
  if (net < target - tol)
    return { label: "Abaixo", classes: "bg-secondary text-muted-foreground" };
  return { label: "Na meta", classes: "bg-success/15 text-success" };
}
