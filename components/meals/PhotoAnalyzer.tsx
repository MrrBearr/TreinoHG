"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  ImagePlus,
  Sparkles,
  RotateCcw,
  Save,
  Pencil,
  Check,
  Plus,
  Trash2,
  Wand2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { MealTypePicker } from "./MealTypePicker";
import { applyPhotoAnalysis } from "@/lib/actions";
import {
  cn,
  fileToBase64,
  formatKcal,
  formatNumber,
  hourInBrazil,
  toDateKey,
} from "@/lib/utils";
import type { MealType } from "@/lib/constants";
import type { AIDetectedFood } from "@/types/database";
import type { PhotoAnalysisResult } from "@/lib/openai/analyze-photo";
import type { EstimatedFood } from "@/lib/openai/estimate-food";

type Step = "capture" | "preview" | "analyzing" | "review";

/**
 * The photo analyzer flow.
 *
 * 1. capture     – pick or take a photo
 * 2. preview     – confirm photo before sending to AI
 * 3. analyzing   – AI is identifying items
 * 4. review      – AI suggestion presented as an editable draft. The user
 *                  freely adds, edits, removes or refines items, then
 *                  explicitly confirms before anything is saved.
 *
 * Everything in `review` is a draft. Nothing is persisted to Supabase until
 * the user taps "Confirmar refeição".
 */
export function PhotoAnalyzer() {
  const router = useRouter();
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  const [step, setStep] = React.useState<Step>("capture");
  const [imageData, setImageData] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PhotoAnalysisResult | null>(null);
  const [foods, setFoods] = React.useState<AIDetectedFood[]>([]);
  const [mealType, setMealType] = React.useState<MealType>(guessMealType());
  const [mealName, setMealName] = React.useState("");
  const [date] = React.useState(toDateKey());
  const [saving, setSaving] = React.useState(false);
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);

  async function onPick(file: File | null | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande", { description: "Máximo 8MB." });
      return;
    }
    const data = await fileToBase64(file);
    setImageData(data);
    setStep("preview");
  }

  async function analyze() {
    if (!imageData) return;
    setStep("analyzing");
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/ai/analyze-photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(j.message || "Falha na análise");
      }
      const json: PhotoAnalysisResult = await res.json();
      setResult(json);
      setFoods(json.foods);
      setStep("review");
    } catch (err) {
      const msg = (err as Error).message || "Falha na análise";
      setAnalyzeError(msg);
      toast.error("Não foi possível analisar", { description: msg });
      setStep("preview");
    }
  }

  function reset() {
    setImageData(null);
    setResult(null);
    setFoods([]);
    setMealName("");
    setAnalyzeError(null);
    setStep("capture");
  }

  function addManualItem() {
    setFoods((arr) => [
      ...arr,
      {
        name: "",
        estimated_quantity: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    ]);
  }

  async function save() {
    const cleaned = foods
      .map((f) => ({
        ...f,
        name: f.name.trim(),
        estimated_quantity: (f.estimated_quantity ?? "").trim(),
      }))
      .filter((f) => f.name.length > 0);

    if (cleaned.length === 0) {
      toast.error("Adicione pelo menos um item antes de confirmar.");
      return;
    }

    setSaving(true);
    const totals = cleaned.reduce(
      (acc, f) => ({
        calories: acc.calories + (Number(f.calories) || 0),
        protein: acc.protein + (Number(f.protein) || 0),
        carbs: acc.carbs + (Number(f.carbs) || 0),
        fat: acc.fat + (Number(f.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    try {
      await applyPhotoAnalysis({
        date,
        meal_type: mealType,
        meal_name: mealName.trim() || undefined,
        detected_foods: cleaned,
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        confidence: result?.confidence ?? 0,
        summary: result?.summary,
      });
      toast.success("Refeição salva");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error("Falha ao salvar", { description: (err as Error).message });
      setSaving(false);
    }
  }

  // ============ Render by step ============
  if (step === "capture") {
    return (
      <div className="space-y-5 animate-fade-in">
        <FlowStepper step={step} />

        <Card className="overflow-hidden border-2 border-dashed bg-gradient-to-br from-secondary/40 to-card">
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <Camera className="h-7 w-7" />
            </span>
            <div>
              <p className="font-display font-semibold">Adicione uma foto</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A IA identifica os alimentos. Você revisa antes de salvar.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="default"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera /> Tirar foto
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => galleryRef.current?.click()}
          >
            <ImagePlus /> Galeria
          </Button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />

        <Card className="bg-secondary/40 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> capture a refeição
            de cima e com boa iluminação. A análise é apenas uma sugestão —
            você pode adicionar, editar ou remover itens livremente antes de
            salvar.
          </p>
        </Card>
      </div>
    );
  }

  if (step === "preview" || step === "analyzing") {
    return (
      <div className="space-y-5 animate-fade-in">
        <FlowStepper step={step} />

        <Card className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageData!}
            alt="Refeição"
            className="aspect-[4/3] w-full object-cover"
          />
        </Card>

        {step === "analyzing" ? (
          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 animate-pulse text-primary" />
              <span className="font-semibold">Analisando refeição...</span>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <p className="pt-1 text-xs text-muted-foreground">
              Isso costuma levar alguns segundos.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {analyzeError && (
              <Card className="border-warning/30 bg-warning/5 p-4 text-sm">
                <p className="text-warning-foreground/80">{analyzeError}</p>
              </Card>
            )}
            <Button size="xl" className="w-full" onClick={analyze}>
              <Sparkles /> Analisar refeição
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full"
              onClick={reset}
            >
              <RotateCcw /> Trocar foto
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ============ review step ============
  const totals = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + (Number(f.calories) || 0),
      protein: acc.protein + (Number(f.protein) || 0),
      carbs: acc.carbs + (Number(f.carbs) || 0),
      fat: acc.fat + (Number(f.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const conf = result?.confidence ?? 0;
  const confLabel = conf >= 0.8 ? "alta" : conf >= 0.55 ? "média" : "baixa";
  const confTone =
    conf >= 0.8 ? "success" : conf >= 0.55 ? "default" : "warning";

  return (
    <div className="space-y-5 animate-fade-in">
      <FlowStepper step={step} />

      {imageData && (
        <Card className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageData}
            alt="Refeição"
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="absolute right-3 top-3 flex gap-2">
            <Badge variant={confTone}>
              <Sparkles className="mr-1 h-3 w-3" /> Confiança {confLabel}
            </Badge>
          </div>
          <div className="absolute left-3 bottom-3">
            <Badge variant="secondary" className="backdrop-blur">
              <Pencil className="mr-1 h-3 w-3" /> Sugestão editável
            </Badge>
          </div>
        </Card>
      )}

      {result?.summary && (
        <Card className="border-accent/30 bg-accent/10 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Resumo da IA
          </div>
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </Card>
      )}

      <div className="space-y-2">
        <Label>Tipo de refeição</Label>
        <MealTypePicker value={mealType} onChange={setMealType} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meal-name">Nome (opcional)</Label>
        <Input
          id="meal-name"
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          placeholder="Ex: Almoço pós-treino"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Itens da refeição</Label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{foods.length}</Badge>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={addManualItem}
              className="text-primary"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {foods.map((f, idx) => (
            <DetectedFoodEditor
              key={`${idx}-${f.name}`}
              food={f}
              onChange={(v) =>
                setFoods((arr) => {
                  const next = [...arr];
                  next[idx] = v;
                  return next;
                })
              }
              onRemove={() =>
                setFoods((arr) => arr.filter((_, i) => i !== idx))
              }
            />
          ))}
          {foods.length === 0 && (
            <Card className="space-y-3 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum item ainda. Adicione manualmente ou volte e tente outra
                foto.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addManualItem}
              >
                <Plus className="h-4 w-4" /> Adicionar item
              </Button>
            </Card>
          )}
        </div>
      </div>

      <div className="sticky bottom-24 z-30 -mx-4 border-t border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl">
        <Card className="flex items-center justify-between gap-3 p-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Total estimado
            </div>
            <div className="stat-number text-xl">
              {formatKcal(totals.calories)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              P {formatNumber(totals.protein)} · C{" "}
              {formatNumber(totals.carbs)} · G {formatNumber(totals.fat)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={reset}
              aria-label="Trocar foto"
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              size="lg"
              loading={saving}
              onClick={save}
              disabled={foods.length === 0}
            >
              <ShieldCheck /> Confirmar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Sub-components                                                          */
/* ====================================================================== */

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "capture", label: "Foto" },
  { id: "preview", label: "Análise" },
  { id: "review", label: "Revisar" },
];

function FlowStepper({ step }: { step: Step }) {
  const order = ["capture", "preview", "review"] as const;
  const stepKey: (typeof order)[number] =
    step === "analyzing" ? "preview" : step;
  const currentIdx = order.indexOf(stepKey);
  return (
    <ol className="flex items-center gap-2" aria-label="Etapas">
      {STEP_LABELS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active &&
                    "border-primary bg-primary/15 text-primary",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate text-[11px] font-semibold uppercase tracking-wider",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  done ? "bg-primary/60" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface DetectedFoodEditorProps {
  food: AIDetectedFood;
  onChange: (f: AIDetectedFood) => void;
  onRemove: () => void;
}

function DetectedFoodEditor({
  food,
  onChange,
  onRemove,
}: DetectedFoodEditorProps) {
  // New empty rows open expanded; previously-edited rows show collapsed.
  const [editing, setEditing] = React.useState(food.name.trim().length === 0);
  const [refining, setRefining] = React.useState(false);

  const set = <K extends keyof AIDetectedFood>(k: K, v: AIDetectedFood[K]) =>
    onChange({ ...food, [k]: v });

  /**
   * Ask the AI to re-estimate just THIS item from its current name +
   * quantity. We hit the existing /api/ai/estimate-food endpoint and adapt
   * EstimatedFood -> AIDetectedFood. The full image is NOT re-analyzed.
   */
  async function refine() {
    const query = [food.estimated_quantity, food.name]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" ");
    if (query.length < 3) {
      toast.error("Descreva melhor o item antes de refinar.");
      return;
    }
    setRefining(true);
    try {
      const res = await fetch("/api/ai/estimate-food", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || "Falha ao refinar");
      }
      const json: { foods?: EstimatedFood[] } = await res.json();
      const foods = Array.isArray(json.foods) ? json.foods : [];
      if (foods.length === 0) {
        toast.error("IA não retornou estimativa", {
          description: "Tente um nome ou quantidade mais específica.",
        });
        return;
      }
      const first = foods[0];
      // The user's typed quantity is authoritative. If they edited a row's
      // quantity to "300g", clicking "Refinar com IA" must not normalise
      // it back to whatever portion the AI prefers. Name and macros are
      // refreshed (that's the point of refining); quantity is preserved
      // when present.
      const userQty = (food.estimated_quantity ?? "").trim();
      onChange({
        name: first.name || food.name,
        estimated_quantity: userQty || first.quantity,
        calories: first.calories || 0,
        protein: first.protein_g || 0,
        carbs: first.carbs_g || 0,
        fat: first.fat_g || 0,
      });
      toast.success("Item atualizado pela IA");
    } catch (err) {
      toast.error("Não foi possível refinar", {
        description: (err as Error).message,
      });
    } finally {
      setRefining(false);
    }
  }

  if (!editing) {
    return (
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-secondary/30">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium leading-tight">
              {food.name || (
                <span className="text-muted-foreground">Sem nome</span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {food.estimated_quantity || "—"} · P{Math.round(food.protein)} C
              {Math.round(food.carbs)} G{Math.round(food.fat)}
            </div>
          </div>
          <div className="stat-number shrink-0 text-sm">
            {formatKcal(food.calories)}
          </div>
        </button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Editar"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-2 border-primary/30 bg-card p-3 shadow-md shadow-primary/5">
      <div className="flex items-center gap-2">
        <Input
          value={food.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Nome do alimento"
          className="h-10 flex-1"
        />
        <Input
          value={food.estimated_quantity}
          onChange={(e) => set("estimated_quantity", e.target.value)}
          className="h-10 w-24 text-center"
          placeholder="qtd"
        />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <NumField
          label="kcal"
          value={food.calories}
          onChange={(v) => set("calories", v)}
        />
        <NumField
          label="prot"
          value={food.protein}
          onChange={(v) => set("protein", v)}
        />
        <NumField
          label="carb"
          value={food.carbs}
          onChange={(v) => set("carbs", v)}
        />
        <NumField
          label="gord"
          value={food.fat}
          onChange={(v) => set("fat", v)}
        />
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={refine}
          disabled={refining || !food.name.trim()}
          className="text-primary"
        >
          <Wand2 className={cn("h-4 w-4", refining && "animate-spin")} />
          {refining ? "Refinando..." : "Refinar com IA"}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            aria-label="Remover item"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setEditing(false)}
            disabled={!food.name.trim()}
          >
            <Check className="h-4 w-4" /> Pronto
          </Button>
        </div>
      </div>
    </Card>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  // Render an empty string while focused-empty so users can clear without
  // showing a "0". Always emits numbers to the parent.
  const [text, setText] = React.useState(
    Number.isFinite(value) && value !== 0 ? String(value) : "",
  );
  React.useEffect(() => {
    setText(Number.isFinite(value) && value !== 0 ? String(value) : "");
  }, [value]);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const n = parseFloat(raw);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="h-10 text-center text-sm"
      />
    </label>
  );
}

function guessMealType(): MealType {
  const h = hourInBrazil();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 17) return "snack";
  if (h < 22) return "dinner";
  return "other";
}
