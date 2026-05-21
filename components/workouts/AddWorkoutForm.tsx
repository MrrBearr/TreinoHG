"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Flame, Timer, Zap } from "lucide-react";
import { WorkoutTypePicker } from "./WorkoutTypePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatKcal, toDateKey } from "@/lib/utils";
import { addWorkout } from "@/lib/actions";
import { estimateWorkoutCalories } from "@/lib/calculations/calories";
import {
  INTENSITY_LEVELS,
  WORKOUT_TYPES,
  type IntensityLevel,
  type WorkoutType,
} from "@/lib/constants";

interface AddWorkoutFormProps {
  defaultDate?: string;
  userWeight: number | null;
}

export function AddWorkoutForm({
  defaultDate,
  userWeight,
}: AddWorkoutFormProps) {
  const router = useRouter();
  const [date, setDate] = React.useState(defaultDate ?? toDateKey());
  const [type, setType] = React.useState<WorkoutType>("fullbody");
  const [name, setName] = React.useState("");
  const [duration, setDuration] = React.useState(45);
  const [treadmill, setTreadmill] = React.useState<number | "">("");
  const [intensity, setIntensity] = React.useState<IntensityLevel>("moderate");
  const [manualKcal, setManualKcal] = React.useState<number | "">("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const weight = userWeight && userWeight > 0 ? userWeight : 70;
  const isRest = type === "rest";

  const estimated = React.useMemo(() => {
    if (isRest) return 0;
    return estimateWorkoutCalories({
      workout_type: type,
      duration_min: duration,
      weight_kg: weight,
      intensity,
    });
  }, [type, duration, weight, intensity, isRest]);

  const finalKcal = manualKcal === "" ? estimated : Number(manualKcal);

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!isRest && duration <= 0) {
      toast.error("Informe a duração");
      return;
    }
    setSaving(true);
    try {
      await addWorkout({
        date,
        workout_type: type,
        name: name.trim() || undefined,
        duration_min: isRest ? 0 : duration,
        treadmill_min: treadmill === "" ? undefined : Number(treadmill),
        intensity: isRest ? undefined : intensity,
        calories_burned: isRest ? 0 : finalKcal,
        notes: notes.trim() || undefined,
      });
      toast.success("Treino registrado");
      router.push("/dashboard");
    } catch (e) {
      console.error("[AddWorkoutForm] save failed:", e);
      const msg = (e as Error).message || "";
      if ((e as Error).name === "AuthRequiredError" || /Sessão expirada/i.test(msg)) {
        toast.error("Sessão expirada", { description: "Faça login novamente." });
        router.push("/login");
        return;
      }
      toast.error("Não foi possível salvar", {
        description: msg || "Tente novamente.",
      });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Tipo</Label>
        <WorkoutTypePicker value={type} onChange={setType} />
      </div>

      <Card className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                WORKOUT_TYPES.find((w) => w.value === type)?.label ?? ""
              }
              className="h-11"
            />
          </div>
        </div>

        {!isRest && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  <Timer className="h-3 w-3" /> Duração total
                </Label>
                <span className="stat-number text-base">
                  {duration}{" "}
                  <span className="text-xs text-muted-foreground">min</span>
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex flex-wrap gap-1.5">
                {[15, 30, 45, 60, 75, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      duration === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card",
                    )}
                  >
                    {m}min
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> Intensidade
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {INTENSITY_LEVELS.map((i) => {
                  const active = intensity === i.value;
                  return (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => setIntensity(i.value)}
                      className={cn(
                        "rounded-xl border py-2 text-xs font-medium transition-all active:scale-95",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card",
                      )}
                    >
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(type === "treadmill" || type === "cardio" ||
              type === "running" || type === "walking") && (
              <div className="space-y-1.5">
                <Label htmlFor="treadmill">Tempo de esteira (opcional)</Label>
                <Input
                  id="treadmill"
                  type="number"
                  inputMode="numeric"
                  placeholder="min"
                  value={treadmill}
                  onChange={(e) =>
                    setTreadmill(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="h-11"
                />
              </div>
            )}
          </>
        )}
      </Card>

      {!isRest && (
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-card to-card p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15 text-orange-500">
              <Flame className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Calorias estimadas
              </div>
              <div className="stat-number text-2xl">
                {formatKcal(estimated)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Baseado em {weight} kg, MET do exercício e intensidade.
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="manual-kcal">Ajustar manualmente (opcional)</Label>
            <Input
              id="manual-kcal"
              type="number"
              inputMode="numeric"
              placeholder={`${estimated}`}
              value={manualKcal}
              onChange={(e) =>
                setManualKcal(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="h-11"
            />
          </div>
        </Card>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Como foi o treino? PRs, sensações, energia..."
          rows={3}
        />
      </div>

      <Button type="submit" loading={saving} size="lg" className="w-full">
        <Save /> Salvar treino
      </Button>
    </form>
  );
}
