"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Save, Flame } from "lucide-react";
import { MealTypePicker } from "./MealTypePicker";
import {
  FoodEntryRow,
  emptyEntry,
  estimatedToDraft,
  type DraftEntry,
} from "./FoodEntryRow";
import type { EstimatedFood } from "@/lib/openai/estimate-food";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { addMeal } from "@/lib/actions";
import {
  formatKcal,
  formatNumber,
  hourInBrazil,
  timeStringBR,
  toDateKey,
} from "@/lib/utils";
import type { MealType } from "@/lib/constants";

interface AddMealFormProps {
  defaultDate?: string;
  defaultMealType?: MealType;
  initialEntries?: DraftEntry[];
  initialMealName?: string;
  initialPhotoUrl?: string;
  initialNotes?: string;
}

export function AddMealForm({
  defaultDate,
  defaultMealType,
  initialEntries,
  initialMealName,
  initialPhotoUrl,
  initialNotes,
}: AddMealFormProps) {
  const router = useRouter();
  const [date, setDate] = React.useState(defaultDate ?? toDateKey());
  const [mealType, setMealType] = React.useState<MealType>(
    defaultMealType ?? guessMealType(),
  );
  const [name, setName] = React.useState(initialMealName ?? "");
  const [time, setTime] = React.useState(currentTime());
  const [notes, setNotes] = React.useState(initialNotes ?? "");
  const [entries, setEntries] = React.useState<DraftEntry[]>(
    initialEntries && initialEntries.length > 0
      ? initialEntries
      : [emptyEntry()],
  );
  const [saving, setSaving] = React.useState(false);

  const totals = React.useMemo(() => {
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + (parseFloat(e.calories) || 0),
        protein_g: acc.protein_g + (parseFloat(e.protein_g) || 0),
        carbs_g: acc.carbs_g + (parseFloat(e.carbs_g) || 0),
        fat_g: acc.fat_g + (parseFloat(e.fat_g) || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
  }, [entries]);

  function updateEntry(idx: number, e: DraftEntry) {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = e;
      return next;
    });
  }
  function addEntry() {
    setEntries((p) => [...p, emptyEntry()]);
  }
  function removeEntry(idx: number) {
    setEntries((p) => p.filter((_, i) => i !== idx));
  }

  /**
   * Replace a single row with the foods returned by the AI when the user
   * typed a description that resolves to multiple distinct foods (e.g.
   * "2 ovos e 100g de arroz" -> [Ovos, Arroz]).
   */
  function expandFromSuggestions(idx: number, foods: EstimatedFood[]) {
    if (foods.length === 0) return;
    setEntries((prev) => {
      const next = [...prev];
      const drafts = foods.map(estimatedToDraft);
      next.splice(idx, 1, ...drafts);
      return next;
    });
  }

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const valid = entries
      .filter((e) => e.name.trim().length > 0)
      .map((e) => ({
        name: e.name.trim(),
        quantity: e.quantity.trim() || undefined,
        calories: parseFloat(e.calories) || 0,
        protein_g: parseFloat(e.protein_g) || 0,
        carbs_g: parseFloat(e.carbs_g) || 0,
        fat_g: parseFloat(e.fat_g) || 0,
      }));
    if (valid.length === 0) {
      toast.error("Adicione pelo menos um alimento");
      return;
    }
    setSaving(true);
    try {
      await addMeal({
        date,
        meal_type: mealType,
        name: name.trim() || undefined,
        time: time || undefined,
        notes: notes.trim() || undefined,
        entries: valid,
      });
      toast.success("Refeição registrada");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar", {
        description: (e as Error).message,
      });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <MealTypePicker value={mealType} onChange={setMealType} />

      {initialPhotoUrl && (
        <div className="overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={initialPhotoUrl}
            alt="Foto da refeição"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      )}

      <Card className="space-y-3 p-4">
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
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome (opcional)</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Frango com arroz e salada"
            className="h-11"
          />
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">Alimentos</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addEntry}
            className="text-primary"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
        {entries.map((e, i) => (
          <FoodEntryRow
            key={e.id}
            entry={e}
            onChange={(v) => updateEntry(i, v)}
            removable={entries.length > 1}
            onRemove={() => removeEntry(i)}
            onMultiSuggest={(foods) => expandFromSuggestions(i, foods)}
          />
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Algo a anotar sobre essa refeição?"
          rows={2}
        />
      </div>

      <div className="sticky bottom-24 z-30 -mx-4 border-t border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl">
        <Card className="flex items-center justify-between gap-3 p-3">
          <div>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Flame className="h-3 w-3" /> Total
            </div>
            <div className="stat-number text-xl">
              {formatKcal(totals.calories)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              P {formatNumber(totals.protein_g)} · C {formatNumber(totals.carbs_g)} · G {formatNumber(totals.fat_g)}
            </div>
          </div>
          <Button type="submit" loading={saving} size="lg" className="px-6">
            <Save /> Salvar
          </Button>
        </Card>
      </div>
    </form>
  );
}

function currentTime(): string {
  // Always show the user the current Brazilian time, regardless of where the
  // device clock thinks it is.
  return timeStringBR();
}

function guessMealType(): MealType {
  const h = hourInBrazil();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 17) return "snack";
  if (h < 22) return "dinner";
  return "other";
}
