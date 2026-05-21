"use client";

import * as React from "react";
import { cn, pct } from "@/lib/utils";

interface MacroBarsProps {
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

export function MacroBars({ protein, carbs, fat }: MacroBarsProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const items = [
    {
      label: "Proteína",
      short: "P",
      ...protein,
      color: "bg-emerald-500",
      track: "bg-emerald-500/10",
      glow: "shadow-emerald-500/30",
    },
    {
      label: "Carboidratos",
      short: "C",
      ...carbs,
      color: "bg-amber-500",
      track: "bg-amber-500/10",
      glow: "shadow-amber-500/30",
    },
    {
      label: "Gordura",
      short: "G",
      ...fat,
      color: "bg-rose-400",
      track: "bg-rose-400/10",
      glow: "shadow-rose-400/30",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((m) => {
        const p = pct(m.current, m.target);
        const isOver = m.current > m.target && m.target > 0;
        return (
          <div key={m.label} className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {m.label}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="stat-number text-lg leading-none">
                {Math.round(m.current)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                /{Math.round(m.target)}g
              </span>
            </div>
            <div className={cn("h-2 w-full overflow-hidden rounded-full", m.track)}>
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  m.color,
                  isOver && "opacity-80",
                )}
                style={{ width: mounted ? `${Math.min(p, 100)}%` : "0%" }}
              />
            </div>
            {isOver && (
              <span className="text-[9px] font-medium text-warning">
                +{Math.round(m.current - m.target)}g
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
