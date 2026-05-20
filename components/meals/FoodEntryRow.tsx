"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DraftEntry {
  id: string;
  name: string;
  quantity: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

export function emptyEntry(): DraftEntry {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name: "",
    quantity: "",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
  };
}

interface FoodEntryRowProps {
  entry: DraftEntry;
  onChange: (e: DraftEntry) => void;
  onRemove?: () => void;
  removable?: boolean;
}

export function FoodEntryRow({
  entry,
  onChange,
  onRemove,
  removable,
}: FoodEntryRowProps) {
  const set = <K extends keyof DraftEntry>(k: K, v: DraftEntry[K]) =>
    onChange({ ...entry, [k]: v });

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2">
        <Input
          value={entry.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Nome do alimento"
          className="h-10 flex-1"
        />
        <Input
          value={entry.quantity}
          onChange={(e) => set("quantity", e.target.value)}
          placeholder="qtd"
          inputMode="text"
          className="h-10 w-24 text-center text-sm"
        />
        {removable && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Remover"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <NumberField
          label="kcal"
          value={entry.calories}
          onChange={(v) => set("calories", v)}
        />
        <NumberField
          label="prot"
          value={entry.protein_g}
          onChange={(v) => set("protein_g", v)}
          unit="g"
        />
        <NumberField
          label="carb"
          value={entry.carbs_g}
          onChange={(v) => set("carbs_g", v)}
          unit="g"
        />
        <NumberField
          label="gord"
          value={entry.fat_g}
          onChange={(v) => set("fat_g", v)}
          unit="g"
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {unit ? ` (${unit})` : ""}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        placeholder="0"
        className="h-10 text-center text-sm"
      />
    </label>
  );
}
