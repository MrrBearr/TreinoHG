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
    default: "bg-secondary text-foreground",
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  }[tone];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm border border-border",
        className,
      )}
    >
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl", toneClasses)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="stat-number text-lg leading-none">{value}</span>
          {unit && (
            <span className="text-[11px] text-muted-foreground">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
