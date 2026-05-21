import Link from "next/link";
import { UtensilsCrossed, Camera, Dumbbell, History } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/meals/add",
    label: "Refeição",
    icon: UtensilsCrossed,
    tone: "bg-primary/10 text-primary group-hover:bg-primary/20",
  },
  {
    href: "/meals/analyze",
    label: "Foto IA",
    icon: Camera,
    tone: "bg-accent/50 text-accent-foreground group-hover:bg-accent/70",
  },
  {
    href: "/workouts/add",
    label: "Treino",
    icon: Dumbbell,
    tone: "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20",
  },
  {
    href: "/history",
    label: "Histórico",
    icon: History,
    tone: "bg-secondary text-foreground group-hover:bg-secondary/80",
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
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm transition-all active:scale-95 hover:shadow-md hover:-translate-y-0.5"
          >
            <span
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl transition-colors",
                a.tone,
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-[10px] font-semibold tracking-wide">
              {a.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
