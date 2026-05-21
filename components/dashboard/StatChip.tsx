import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatChipProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
  tone?: "default" | "primary" | "warning" | "success";
}

export function StatChip({
  icon: Icon,
  label,
  value,
  unit,
  className,
  tone = "default",
}: StatChipProps) {
  const toneClasses = {
    default: "bg-secondary/80 text-foreground",
    primary: "bg-primary/12 text-primary",
    warning: "bg-warning/12 text-warning",
    success: "bg-success/12 text-success",
  }[tone];

  const iconShadow = {
    default: "",
    primary: "shadow-primary/20",
    warning: "shadow-warning/20",
    success: "shadow-success/20",
  }[tone];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card/80 p-3 border border-border/60 backdrop-blur-sm transition-all",
        className,
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm",
          toneClasses,
          iconShadow,
        )}
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="stat-number text-lg leading-none">{value}</span>
          {unit && (
            <span className="text-[10px] font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
