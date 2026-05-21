"use client";

import * as React from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EstimatedFood } from "@/lib/ai/types";

export interface DraftEntry {
  id: string;
  name: string;
  quantity: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  /** Marks this row was filled by AI — shown for user awareness */
  ai_filled?: boolean;
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

/** Convert an AI-estimated food into a DraftEntry */
export function estimatedToDraft(f: EstimatedFood): DraftEntry {
  return {
    ...emptyEntry(),
    name: f.name,
    quantity: f.quantity,
    calories: f.calories ? String(f.calories) : "",
    protein_g: f.protein_g ? String(f.protein_g) : "",
    carbs_g: f.carbs_g ? String(f.carbs_g) : "",
    fat_g: f.fat_g ? String(f.fat_g) : "",
    ai_filled: true,
  };
}

interface FoodEntryRowProps {
  entry: DraftEntry;
  onChange: (e: DraftEntry) => void;
  onRemove?: () => void;
  removable?: boolean;
  /** Called when AI returns 2+ foods — parent replaces this row with multiple */
  onMultiExpand?: (foods: EstimatedFood[]) => void;
}

const DEBOUNCE_MS = 1200;
const MIN_CHARS = 3;

export function FoodEntryRow({
  entry,
  onChange,
  onRemove,
  removable,
  onMultiExpand,
}: FoodEntryRowProps) {
  const [loading, setLoading] = React.useState(false);
  const [errored, setErrored] = React.useState(false);
  const lastQueryRef = React.useRef("");
  const abortRef = React.useRef<AbortController | null>(null);
  const entryRef = React.useRef(entry);
  entryRef.current = entry;

  const set = <K extends keyof DraftEntry>(k: K, v: DraftEntry[K]) =>
    onChange({ ...entry, [k]: v });

  const macrosEmpty = (e: DraftEntry) =>
    !e.calories && !e.protein_g && !e.carbs_g && !e.fat_g;

  const buildQuery = (e: DraftEntry) =>
    [e.quantity, e.name].filter(Boolean).join(" ").trim();

  const runEstimate = React.useCallback(
    async (manual: boolean) => {
      const current = entryRef.current;
      const query = buildQuery(current);
      if (query.length < MIN_CHARS) return;

      // Skip duplicate requests unless explicitly triggered
      if (!manual && lastQueryRef.current === query) return;
      lastQueryRef.current = query;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setErrored(false);
      try {
        const res = await fetch("/api/ai/estimate-food", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setErrored(true);
          return;
        }

        const json: { foods?: EstimatedFood[] } = await res.json();
        const foods = Array.isArray(json.foods) ? json.foods : [];
        if (foods.length === 0) {
          if (manual) setErrored(true);
          return;
        }

        // Multi-food: tell parent to expand
        if (foods.length > 1 && onMultiExpand) {
          onMultiExpand(foods);
          return;
        }

        // Single food: fill this row
        const f = foods[0];
        const target = entryRef.current;
        onChange({
          ...target,
          name: manual || !target.name ? f.name : target.name,
          quantity: manual || !target.quantity ? f.quantity : target.quantity,
          calories:
            manual || !target.calories
              ? f.calories ? String(f.calories) : ""
              : target.calories,
          protein_g:
            manual || !target.protein_g
              ? f.protein_g ? String(f.protein_g) : ""
              : target.protein_g,
          carbs_g:
            manual || !target.carbs_g
              ? f.carbs_g ? String(f.carbs_g) : ""
              : target.carbs_g,
          fat_g:
            manual || !target.fat_g
              ? f.fat_g ? String(f.fat_g) : ""
              : target.fat_g,
          ai_filled: true,
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setErrored(true);
      } finally {
        setLoading(false);
      }
    },
    [onChange, onMultiExpand],
  );

  // Debounced auto-estimate: only when name has min chars and macros are empty
  React.useEffect(() => {
    if (!entry.name || entry.name.length < MIN_CHARS) return;
    if (!macrosEmpty(entry)) return;
    const query = buildQuery(entry);
    if (lastQueryRef.current === query) return;

    const timer = setTimeout(() => runEstimate(false), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.name, entry.quantity]);

  // Cleanup on unmount
  React.useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-3 transition-all">
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
          className="h-10 w-20 text-center text-sm"
        />
        <Button
          type="button"
          size="icon-sm"
          variant={entry.ai_filled ? "default" : "ghost"}
          aria-label="Estimar com IA"
          title="Estimar calorias e macros"
          onClick={() => runEstimate(true)}
          disabled={loading || !entry.name || entry.name.length < MIN_CHARS}
        >
          <Sparkles className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
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
      {/* Status indicator */}
      {(loading || errored || entry.ai_filled) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {loading ? (
            <>
              <Sparkles className="h-3 w-3 animate-pulse text-primary" />
              <span>Estimando com IA...</span>
            </>
          ) : errored ? (
            <span className="text-warning">
              Não consegui estimar — preencha manualmente.
            </span>
          ) : entry.ai_filled ? (
            <>
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Estimado por IA — confira e ajuste se precisar.</span>
            </>
          ) : null}
        </div>
      )}
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
