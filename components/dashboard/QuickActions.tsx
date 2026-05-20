import Link from "next/link";
import { UtensilsCrossed, Camera, Dumbbell, History } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/meals/add",
    label: "Refeição",
    icon: UtensilsCrossed,
    tone: "bg-primary/10 text-primary",
  },
  {
    href: "/meals/analyze",
    label: "Foto IA",
    icon: Camera,
    tone: "bg-accent/40 text-accent-foreground",
  },
  {
    href: "/workouts/add",
    label: "Treino",
    icon: Dumbbell,
    tone: "bg-orange-500/10 text-orange-500",
  },
  {
    href: "/history",
    label: "Histórico",
    icon: History,
    tone: "bg-secondary text-foreground",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm transition-all active:scale-95 hover:border-primary/40"
          >
            <span
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl",
                a.tone,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
