import Link from "next/link";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MEAL_TYPES } from "@/lib/constants";
import { formatKcal } from "@/lib/utils";
import type { FoodEntry, Meal } from "@/types/database";

interface MealsSummaryProps {
  meals: Meal[];
  entries: FoodEntry[];
  date: string;
}

export function MealsSummary({ meals, entries, date }: MealsSummaryProps) {
  const byMeal = new Map<string, { kcal: number; count: number }>();
  for (const e of entries) {
    const k = byMeal.get(e.meal_id) ?? { kcal: 0, count: 0 };
    k.kcal += Number(e.calories ?? 0);
    k.count += 1;
    byMeal.set(e.meal_id, k);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <h3 className="font-semibold">Refeições</h3>
          <Badge variant="secondary">{meals.length}</Badge>
        </div>
        <Link
          href={`/history/${date}`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Ver tudo
        </Link>
      </div>
      <div className="divide-y divide-border">
        {meals.length === 0 ? (
          <div className="px-5 pb-5 pt-1">
            <p className="text-sm text-muted-foreground">
              Nenhuma refeição registrada hoje.
            </p>
            <Link
              href="/meals/add"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Registrar agora →
            </Link>
          </div>
        ) : (
          meals.map((m) => {
            const meta =
              MEAL_TYPES.find((t) => t.value === m.meal_type) ?? MEAL_TYPES[6];
            const stat = byMeal.get(m.id) ?? { kcal: 0, count: 0 };
            return (
              <Link
                key={m.id}
                href={`/history/${date}#meal-${m.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
              >
                <span className="text-2xl">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-tight">
                    {m.name || meta.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.count} {stat.count === 1 ? "item" : "itens"}
                    {m.time ? ` · ${m.time.slice(0, 5)}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="stat-number text-sm">
                    {formatKcal(stat.kcal)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
