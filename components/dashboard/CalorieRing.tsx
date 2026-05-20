"use client";

import { cn, formatNumber } from "@/lib/utils";

interface CalorieRingProps {
  consumed: number;
  burned: number;
  target: number;
  className?: string;
}

export function CalorieRing({
  consumed,
  burned,
  target,
  className,
}: CalorieRingProps) {
  const net = consumed - burned;
  const safeTarget = target > 0 ? target : 2000;
  const ratio = Math.min(net / safeTarget, 1.2);
  const remaining = Math.max(0, safeTarget - net);
  const over = net > safeTarget;

  // Two stacked rings: outer = consumption progress vs target, inner = burned indicator
  const radius = 90;
  const stroke = 14;
  const circ = 2 * Math.PI * radius;
  const dash = Math.min(Math.abs(ratio), 1) * circ;

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[260px]", className)}>
      <svg
        viewBox="0 0 220 220"
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent-foreground))" />
          </linearGradient>
        </defs>
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke={over ? "hsl(var(--warning))" : "url(#ring-grad)"}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {over ? "Acima da meta" : "Restante hoje"}
        </span>
        <span className="stat-number mt-1 text-5xl leading-none">
          {formatNumber(over ? net - safeTarget : remaining)}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          de {formatNumber(safeTarget)} kcal
        </span>
        <div className="mt-3 flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {formatNumber(consumed)}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            -{formatNumber(burned)}
          </span>
        </div>
      </div>
    </div>
  );
}
