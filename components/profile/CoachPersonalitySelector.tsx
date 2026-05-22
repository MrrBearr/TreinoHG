"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateCoachPersonality } from "@/lib/actions";
import {
  COACH_PERSONALITIES,
  DEFAULT_COACH_PERSONALITY,
  type CoachPersonalityId,
} from "@/lib/coach/personalities";

interface CoachPersonalitySelectorProps {
  current: string | null;
}

export function CoachPersonalitySelector({
  current,
}: CoachPersonalitySelectorProps) {
  const initial =
    (COACH_PERSONALITIES.find((p) => p.value === current)?.value ??
      DEFAULT_COACH_PERSONALITY) as CoachPersonalityId;

  const [active, setActive] = React.useState<CoachPersonalityId>(initial);
  const [pending, startTransition] = React.useTransition();

  function pick(value: CoachPersonalityId) {
    if (value === active) return;
    const previous = active;
    setActive(value);
    startTransition(async () => {
      try {
        await updateCoachPersonality(value);
        toast.success("Coach atualizado", {
          description: `Tom: ${
            COACH_PERSONALITIES.find((p) => p.value === value)?.label ?? value
          }`,
        });
      } catch (e) {
        // Roll back optimistic update on failure.
        setActive(previous);
        toast.error("Falha ao salvar coach", {
          description: (e as Error).message,
        });
      }
    });
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <Label className="text-sm">Personalidade do coach</Label>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Define o tom usado nos insights, no chat com o coach e nas mensagens
        diárias. Você pode trocar a qualquer momento.
      </p>
      <div className="grid gap-2">
        {COACH_PERSONALITIES.map((p) => {
          const isActive = active === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => pick(p.value)}
              disabled={pending && !isActive}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99]",
                isActive
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/15"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary",
                )}
              >
                {p.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">
                  {p.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {p.description}
                </span>
              </span>
              {isActive && (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
