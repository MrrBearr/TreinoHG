import { cn, formatGrams, pct } from "@/lib/utils";

interface MacroBarsProps {
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

export function MacroBars({ protein, carbs, fat }: MacroBarsProps) {
  const items = [
    {
      label: "Proteína",
      ...protein,
      color: "bg-emerald-500",
      track: "bg-emerald-500/15",
    },
    {
      label: "Carboidratos",
      ...carbs,
      color: "bg-amber-500",
      track: "bg-amber-500/15",
    },
    { label: "Gordura", ...fat, color: "bg-rose-500", track: "bg-rose-500/15" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((m) => {
        const p = pct(m.current, m.target);
        return (
          <div key={m.label} className="space-y-2">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                {m.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="stat-number text-lg leading-none">
                {Math.round(m.current)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                /{Math.round(m.target)}g
              </span>
            </div>
            <div className={cn("h-1.5 w-full overflow-hidden rounded-full", m.track)}>
              <div
                className={cn("h-full rounded-full transition-all duration-500", m.color)}
                style={{ width: `${p}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
