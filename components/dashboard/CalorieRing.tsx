"use client";

import * as React from "react";
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
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const net = consumed - burned;
  const safeTarget = target > 0 ? target : 2000;
  const ratio = Math.min(net / safeTarget, 1.2);
  const remaining = Math.max(0, safeTarget - net);
  const over = net > safeTarget;
  const pct = Math.min(Math.abs(ratio) * 100, 100);

  const radius = 88;
  const stroke = 12;
  const circ = 2 * Math.PI * radius;
  const dash = mounted ? (Math.min(Math.abs(ratio), 1) * circ) : 0;

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[240px]", className)}>
      <svg
        viewBox="0 0 220 220"
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent-foreground))" />
          </linearGradient>
          <filter id="ring-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
          fill="none"
          opacity="0.6"
        />
        {/* Progress ring */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke={over ? "hsl(var(--warning))" : "url(#ring-gradient)"}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          filter={mounted ? "url(#ring-glow)" : undefined}
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {over ? "Acima da meta" : "Restante"}
        </span>
        <span className="stat-number mt-1 text-4xl leading-none md:text-5xl">
          {formatNumber(over ? net - safeTarget : remaining)}
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground">
          de {formatNumber(safeTarget)} kcal
        </span>
        <div className="mt-3 flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
            {formatNumber(consumed)}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
            -{formatNumber(burned)}
          </span>
        </div>
      </div>

      {/* Progress percentage badge */}
      {mounted && pct > 0 && (
        <div className="absolute -right-1 top-1/2 -translate-y-1/2">
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold shadow-lg",
            over
              ? "bg-warning text-warning-foreground"
              : pct >= 90
                ? "bg-success text-success-foreground"
                : "bg-secondary text-foreground"
          )}>
            {Math.round(pct)}%
          </span>
        </div>
      )}
    </div>
  );
}
