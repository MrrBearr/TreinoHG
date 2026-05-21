"use client";

import * as React from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EstimatedFood } from "@/lib/openai/estimate-food";

export interface DraftEntry {
  id: string;
  name: string;
  quantity: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  /** Internal flag used by the form for optimistic UI; never persisted. */
  ai_estimated?: boolean;
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

/** Convert an AI-estimated food into a draft entry suitable for the form. */
export function estimatedToDraft(f: EstimatedFood): DraftEntry {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name: f.name,
    quantity: f.quantity,
    calories: f.calories ? String(f.calories) : "",
    protein_g: f.protein_g ? String(f.protein_g) : "",
    carbs_g: f.carbs_g ? String(f.carbs_g) : "",
    fat_g: f.fat_g ? String(f.fat_g) : "",
    ai_estimated: true,
  };
}

interface FoodEntryRowProps {
  entry: DraftEntry;
  onChange: (e: DraftEntry) => void;
  onRemove?: () => void;
  removable?: boolean;
  /**
   * Called when the AI returns 2+ foods so the parent form can replace this
   * row with multiple rows. When the AI returns a single food, the row
   * autofills its own fields and does not call this.
   */
  onMultiSuggest?: (foods: EstimatedFood[]) => void;
}

const MIN_NAME_CHARS = 3;
const DEBOUNCE_MS = 1200;

export function FoodEntryRow({
  entry,
  onChange,
  onRemove,
  removable,
  onMultiSuggest,
}: FoodEntryRowProps) {
  const [loading, setLoading] = React.useState(false);
  const [errored, setErrored] = React.useState(false);
  const lastQueriedRef = React.useRef<string>("");
  const abortRef = React.useRef<AbortController | null>(null);

  // Keep refs to the latest entry + handlers so the debounce timer can
  // resolve against the most recent state without stale closures.
  const entryRef = React.useRef(entry);
  entryRef.current = entry;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const onMultiRef = React.useRef(onMultiSuggest);
  onMultiRef.current = onMultiSuggest;

  const set = <K extends keyof DraftEntry>(k: K, v: DraftEntry[K]) =>
    onChange({ ...entry, [k]: v });

  const macrosEmpty = (e: DraftEntry) =>
    !e.calories && !e.protein_g && !e.carbs_g && !e.fat_g;

  const queryFor = (e: DraftEntry) =>
    [e.quantity, e.name].filter(Boolean).join(" ").trim();

  const runEstimate = React.useCallback(async (manual: boolean) => {
    const current = entryRef.current;
    const query = queryFor(current);
    if (query.length < MIN_NAME_CHARS) return;

    // Avoid duplicate calls for the same query unless user explicitly clicks.
    if (!manual && lastQueriedRef.current === query) return;
    lastQueriedRef.current = query;

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

      // If 2+ foods came back, let the parent expand into multiple rows.
      // If only 1, fill the current row in place. We never overwrite values
      // the user has edited unless they explicitly hit the AI button.
      if (foods.length > 1 && onMultiRef.current) {
        onMultiRef.current(foods);
        return;
      }

      const first = foods[0];
      const target = entryRef.current;
      const next: DraftEntry = {
        ...target,
        name: manual || !target.name ? first.name : target.name,
        quantity:
          manual || !target.quantity ? first.quantity : target.quantity,
        calories:
          manual || !target.calories
            ? first.calories
              ? String(first.calories)
              : target.calories
            : target.calories,
        protein_g:
          manual || !target.protein_g
            ? first.protein_g
              ? String(first.protein_g)
              : target.protein_g
            : target.protein_g,
        carbs_g:
          manual || !target.carbs_g
            ? first.carbs_g
              ? String(first.carbs_g)
              : target.carbs_g
            : target.carbs_g,
        fat_g:
          manual || !target.fat_g
            ? first.fat_g
              ? String(first.fat_g)
              : target.fat_g
            : target.fat_g,
        ai_estimated: true,
      };
      onChangeRef.current(next);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error("[ai] estimate row failed", err);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced auto-estimate while the user types — only fires when:
  // - name is long enough
  // - all macro fields are still empty (so we never overwrite user input)
  // - the same query hasn't been asked already
  React.useEffect(() => {
    if (!entry.name || entry.name.length < MIN_NAME_CHARS) return;
    if (!macrosEmpty(entry)) return;
    const query = queryFor(entry);
    if (lastQueriedRef.current === query) return;

    const handle = setTimeout(() => {
      runEstimate(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [entry.name, entry.quantity, entry.calories, entry.protein_g, entry.carbs_g, entry.fat_g, runEstimate, entry]);

  // Cancel any in-flight request when the row unmounts.
  React.useEffect(() => () => abortRef.current?.abort(), []);

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
          className="h-10 w-20 text-center text-sm"
        />
        <Button
          type="button"
          size="icon-sm"
          variant={entry.ai_estimated ? "default" : "ghost"}
          aria-label="Estimar com IA"
          title="Estimar calorias e macros com IA"
          onClick={() => runEstimate(true)}
          disabled={
            loading || !entry.name || entry.name.length < MIN_NAME_CHARS
          }
          className={cn(loading && "animate-pulse")}
        >
          <Sparkles
            className={cn("h-4 w-4", loading && "animate-spin")}
          />
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
      {(loading || errored || entry.ai_estimated) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {loading ? (
            <>
              <Sparkles className="h-3 w-3 animate-pulse text-primary" />
              Estimando com IA…
            </>
          ) : errored ? (
            <span className="text-warning">
              Não consegui estimar agora — preencha manualmente.
            </span>
          ) : entry.ai_estimated ? (
            <>
              <Sparkles className="h-3 w-3 text-primary" />
              Estimado por IA — confira e ajuste se precisar.
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
