"use client";

import * as React from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateTheme } from "@/lib/actions";

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "premium", label: "Premium", icon: Sparkles },
] as const;

export function ThemeSelector({
  current,
}: {
  current: "light" | "dark" | "premium";
}) {
  const { setTheme } = useTheme();
  const [pending, startTransition] = React.useTransition();
  const [active, setActive] = React.useState(current);

  function pick(v: "light" | "dark" | "premium") {
    setActive(v);
    setTheme(v);
    startTransition(async () => {
      try {
        await updateTheme(v);
      } catch {
        toast.error("Falha ao salvar tema");
      }
    });
  }

  return (
    <Card className="p-4">
      <Label className="mb-3 block">Tema</Label>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.value;
          return (
            <button
              key={t.value}
              type="button"
              disabled={pending}
              onClick={() => pick(t.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-all active:scale-95",
                isActive
                  ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/15"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
