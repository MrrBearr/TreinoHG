"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_LEVELS,
  GOALS,
  SEX_OPTIONS,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "@/lib/constants";
import { calculateAllTargets } from "@/lib/calculations/nutrition";
import { updateProfile } from "@/lib/actions";
import type { Profile } from "@/types/database";

interface ProfileFormProps {
  profile: Profile | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState(profile?.display_name ?? "");
  const [age, setAge] = React.useState<number | "">(profile?.age ?? "");
  const [sex, setSex] = React.useState<Sex | "">((profile?.sex as Sex) ?? "");
  const [height, setHeight] = React.useState<number | "">(
    profile?.height_cm ?? "",
  );
  const [weight, setWeight] = React.useState<number | "">(
    profile?.weight_kg ?? "",
  );
  const [activity, setActivity] = React.useState<ActivityLevel | "">(
    (profile?.activity_level as ActivityLevel) ?? "",
  );
  const [goal, setGoal] = React.useState<Goal | "">(
    (profile?.goal as Goal) ?? "",
  );
  const [calTarget, setCalTarget] = React.useState<number | "">(
    profile?.calorie_target ?? "",
  );
  const [proteinTarget, setProteinTarget] = React.useState<number | "">(
    profile?.protein_target_g ?? "",
  );
  const [carbsTarget, setCarbsTarget] = React.useState<number | "">(
    profile?.carbs_target_g ?? "",
  );
  const [fatTarget, setFatTarget] = React.useState<number | "">(
    profile?.fat_target_g ?? "",
  );
  const [waterTarget, setWaterTarget] = React.useState<number | "">(
    profile?.water_target_ml ?? "",
  );
  const [foodPref, setFoodPref] = React.useState(profile?.food_preferences ?? "");
  const [restrictions, setRestrictions] = React.useState(
    profile?.dietary_restrictions ?? "",
  );

  const canCalculate =
    typeof age === "number" &&
    typeof height === "number" &&
    typeof weight === "number" &&
    sex &&
    activity &&
    goal;

  const computed = React.useMemo(() => {
    if (!canCalculate) return null;
    return calculateAllTargets({
      age: Number(age),
      height_cm: Number(height),
      weight_kg: Number(weight),
      sex: sex as Sex,
      activity_level: activity as ActivityLevel,
      goal: goal as Goal,
    });
  }, [age, height, weight, sex, activity, goal, canCalculate]);

  function applyComputed() {
    if (!computed) return;
    setCalTarget(computed.calorie_target);
    setProteinTarget(computed.protein_g);
    setCarbsTarget(computed.carbs_g);
    setFatTarget(computed.fat_g);
    toast.success("Metas atualizadas com base no perfil");
  }

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("display_name", name);
      fd.set("age", age === "" ? "" : String(age));
      fd.set("sex", sex);
      fd.set("height_cm", height === "" ? "" : String(height));
      fd.set("weight_kg", weight === "" ? "" : String(weight));
      fd.set("activity_level", activity);
      fd.set("goal", goal);
      fd.set("calorie_target", calTarget === "" ? "" : String(calTarget));
      fd.set(
        "protein_target_g",
        proteinTarget === "" ? "" : String(proteinTarget),
      );
      fd.set("carbs_target_g", carbsTarget === "" ? "" : String(carbsTarget));
      fd.set("fat_target_g", fatTarget === "" ? "" : String(fatTarget));
      fd.set("water_target_ml", waterTarget === "" ? "" : String(waterTarget));
      fd.set("food_preferences", foodPref);
      fd.set("dietary_restrictions", restrictions);
      await updateProfile(fd);
      toast.success("Perfil salvo");
    } catch (e) {
      console.error("[ProfileForm] save failed:", e);
      const msg = (e as Error).message || "";
      if ((e as Error).name === "AuthRequiredError" || /Sessão expirada/i.test(msg)) {
        toast.error("Sessão expirada", { description: "Faça login novamente." });
        router.push("/login");
        return;
      }
      toast.error("Erro ao salvar", {
        description: msg || "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Identificação</h3>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="h-11"
          />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Dados físicos</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="age">Idade</Label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) =>
                setAge(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-11"
              placeholder="anos"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sexo</Label>
            <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {SEX_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">Altura (cm)</Label>
            <Input
              id="height"
              type="number"
              inputMode="numeric"
              value={height}
              onChange={(e) =>
                setHeight(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-11"
              placeholder="cm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) =>
                setWeight(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-11"
              placeholder="kg"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Objetivo e atividade</h3>
        <div className="space-y-1.5">
          <Label>Objetivo</Label>
          <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {GOALS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Nível de atividade</Label>
          <Select
            value={activity}
            onValueChange={(v) => setActivity(v as ActivityLevel)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_LEVELS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {computed && (
        <Card className="space-y-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Cálculo automático</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Stat label="BMR" value={`${computed.bmr} kcal`} />
            <Stat label="TDEE" value={`${computed.tdee} kcal`} />
            <Stat label="Meta" value={`${computed.calorie_target} kcal`} />
            <Stat label="Proteína" value={`${computed.protein_g}g`} />
            <Stat label="Carboidratos" value={`${computed.carbs_g}g`} />
            <Stat label="Gordura" value={`${computed.fat_g}g`} />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={applyComputed}
          >
            Usar como minhas metas
          </Button>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Metas diárias</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Calorias"
            unit="kcal"
            value={calTarget}
            onChange={setCalTarget}
          />
          <Field
            label="Água"
            unit="ml"
            value={waterTarget}
            onChange={setWaterTarget}
          />
          <Field
            label="Proteína"
            unit="g"
            value={proteinTarget}
            onChange={setProteinTarget}
          />
          <Field
            label="Carboidratos"
            unit="g"
            value={carbsTarget}
            onChange={setCarbsTarget}
          />
          <Field
            label="Gordura"
            unit="g"
            value={fatTarget}
            onChange={setFatTarget}
          />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Preferências</h3>
        <div className="space-y-1.5">
          <Label htmlFor="food_pref">Preferências alimentares</Label>
          <Textarea
            id="food_pref"
            value={foodPref}
            onChange={(e) => setFoodPref(e.target.value)}
            placeholder="Ex: gosto de frango, arroz, ovos..."
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="restrictions">Restrições</Label>
          <Textarea
            id="restrictions"
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            placeholder="Ex: lactose, glúten, vegetariano..."
            rows={2}
          />
        </div>
      </Card>

      <Button type="submit" size="lg" className="w-full" loading={saving}>
        <Save /> Salvar perfil
      </Button>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="stat-number">{value}</span>
    </div>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: number | "";
  onChange: (v: number | "") => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="h-11 pr-12"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}
