"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, UtensilsCrossed, Dumbbell, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/meals/add",
    label: "Refeição",
    icon: UtensilsCrossed,
    bg: "bg-primary text-primary-foreground",
  },
  {
    href: "/meals/analyze",
    label: "Foto IA",
    icon: Camera,
    bg: "bg-accent text-accent-foreground",
  },
  {
    href: "/workouts/add",
    label: "Treino",
    icon: Dumbbell,
    bg: "bg-foreground text-background",
  },
];

export function FAB() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <>
      {open && (
        <button
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in"
        />
      )}
      <div className="fixed bottom-20 right-1/2 z-50 translate-x-1/2 sm:right-6 sm:translate-x-0">
        <div className="relative flex flex-col items-center gap-3">
          {open &&
            ACTIONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-2.5 shadow-xl animate-in slide-in-from-bottom-2",
                    a.bg,
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{a.label}</span>
                </Link>
              );
            })}
          <button
            aria-label={open ? "Fechar ações" : "Abrir ações"}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 transition-transform active:scale-95",
              open && "rotate-45",
            )}
          >
            {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </>
  );
}
