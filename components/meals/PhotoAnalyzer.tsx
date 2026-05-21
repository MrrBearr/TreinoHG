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
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MealTypePicker } from "./MealTypePicker";
import { Input } from "@/components/ui/input";
import { applyPhotoAnalysis } from "@/lib/actions";
import { fileToBase64, formatKcal, formatNumber, toDateKey } from "@/lib/utils";
import type { MealType } from "@/lib/constants";
import type { EstimatedFood, PhotoAnalysisResult } from "@/lib/ai/types";

type Step = "capture" | "preview" | "analyzing" | "review" | "error";

export function PhotoAnalyzer() {
  const router = useRouter();
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  const [step, setStep] = React.useState<Step>("capture");
  const [imageData, setImageData] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PhotoAnalysisResult | null>(null);
  const [foods, setFoods] = React.useState<EstimatedFood[]>([]);
  const [mealType, setMealType] = React.useState<MealType>(guessMealType());
  const [date] = React.useState(toDateKey());
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  async function onPick(file: File | null | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande", { description: "Máximo 8MB." });
      return;
    }
    try {
      const data = await fileToBase64(file);
      setImageData(data);
      setStep("preview");
    } catch {
      toast.error("Erro ao processar imagem");
    }
  }

  async function analyze() {
    if (!imageData) return;
    setStep("analyzing");
    setErrorMsg("");
    try {
      console.log(
        `[analyze-photo] Sending image (size=${imageData.length} bytes)`,
      );
      const res = await fetch("/api/ai/analyze-photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const json = await res.json().catch(() => ({}));
      console.log(
        `[analyze-photo] Response: HTTP ${res.status}`,
        json.error
          ? { error: json.error, message: json.message }
          : { foods: json.foods?.length ?? 0, kcal: json.total_calories },
      );

      if (!res.ok || json.fallback || json.error) {
        const msg =
          json.message ||
          json.summary ||
          `Erro HTTP ${res.status}. Verifique a configuração da IA.`;
        console.error("[analyze-photo] Failed:", msg);
        setErrorMsg(msg);
        setStep("error");
        return;
      }

      const analysisResult: PhotoAnalysisResult = json;
      setResult(analysisResult);
      setFoods(analysisResult.foods ?? []);
      setStep("review");
    } catch (err) {
      console.error("[analyze-photo] Network/unexpected error:", err);
      setErrorMsg(
        (err as Error).message || "Erro de conexão. Tente novamente.",
      );
      setStep("error");
    }
  }

  function reset() {
    setImageData(null);
    setResult(null);
    setFoods([]);
    setErrorMsg("");
    setStep("capture");
  }

  async function save() {
    if (!result && foods.length === 0) return;
    setSaving(true);
    const totals = foods.reduce(
      (acc, f) => ({
        calories: acc.calories + (f.calories || 0),
        protein: acc.protein + (f.protein_g || 0),
        carbs: acc.carbs + (f.carbs_g || 0),
        fat: acc.fat + (f.fat_g || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    try {
      await applyPhotoAnalysis({
        date,
        meal_type: mealType,
        detected_foods: foods.map((f) => ({
          name: f.name,
          estimated_quantity: f.quantity,
          calories: f.calories,
          protein: f.protein_g,
          carbs: f.carbs_g,
          fat: f.fat_g,
        })),
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        confidence: result?.confidence ?? 0.7,
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

  // ============ CAPTURE STEP ============
  if (step === "capture") {
    return (
      <div className="space-y-5 animate-fade-in">
        <Card className="overflow-hidden border-dashed border-2 border-primary/30">
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 p-6 text-center bg-gradient-to-br from-primary/5 to-transparent">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/10">
              <Camera className="h-7 w-7" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">
                Fotografe sua refeição
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                A IA identifica os alimentos e estima calorias e macros
                automaticamente.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="default"
            onClick={() => cameraRef.current?.click()}
            className="h-14"
          >
            <Camera className="h-5 w-5" /> Tirar foto
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => galleryRef.current?.click()}
            className="h-14"
          >
            <ImagePlus className="h-5 w-5" /> Galeria
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
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> capture de cima com
            boa iluminação. Você revisa e edita antes de salvar — nada é gravado
            automaticamente.
          </p>
        </Card>
      </div>
    );
  }

  // ============ PREVIEW / ANALYZING ============
  if (step === "preview" || step === "analyzing") {
    return (
      <div className="space-y-5 animate-fade-in">
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
            <p className="text-xs text-muted-foreground">
              Identificando alimentos e estimando calorias com IA.
            </p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </Card>
        ) : (
          <div className="space-y-3">
            <Button size="xl" className="w-full h-14" onClick={analyze}>
              <Sparkles className="h-5 w-5" /> Analisar refeição
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

  // ============ ERROR STEP ============
  if (step === "error") {
    return (
      <div className="space-y-5 animate-fade-in">
        {imageData && (
          <Card className="overflow-hidden opacity-75">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData}
              alt="Refeição"
              className="aspect-[4/3] w-full object-cover"
            />
          </Card>
        )}
        <Card className="border-warning/30 bg-warning/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            <span className="font-semibold">Não foi possível analisar</span>
          </div>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <div className="flex gap-2">
            <Button size="lg" variant="default" onClick={analyze} className="flex-1">
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
            <Button size="lg" variant="outline" onClick={reset} className="flex-1">
              <RotateCcw className="h-4 w-4" /> Trocar foto
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ============ REVIEW STEP ============
  const totals = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      protein: acc.protein + (f.protein_g || 0),
      carbs: acc.carbs + (f.carbs_g || 0),
      fat: acc.fat + (f.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const conf = result?.confidence ?? 0;
  const confLabel = conf >= 0.8 ? "alta" : conf >= 0.55 ? "média" : "baixa";
  const confTone: "success" | "default" | "warning" =
    conf >= 0.8 ? "success" : conf >= 0.55 ? "default" : "warning";

  return (
    <div className="space-y-5 animate-fade-in">
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
        </Card>
      )}

      {result?.summary && (
        <Card className="border-accent/30 bg-accent/10 p-4">
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </Card>
      )}

      <div className="space-y-2">
        <Label>Tipo de refeição</Label>
        <MealTypePicker value={mealType} onChange={setMealType} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Itens detectados</Label>
          <Badge variant="secondary">{foods.length}</Badge>
        </div>
        <div className="space-y-2">
          {foods.map((f, idx) => (
            <DetectedFoodEditor
              key={idx}
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
            <Card className="p-4 text-sm text-muted-foreground text-center">
              Nenhum item detectado. Tente com outra foto ou adicione manualmente.
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
            <Button type="button" variant="ghost" size="lg" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="lg"
              loading={saving}
              onClick={save}
              disabled={foods.length === 0}
            >
              <Save /> Salvar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Detected Food Editor ──────────────────────────────────────

function DetectedFoodEditor({
  food,
  onChange,
  onRemove,
}: {
  food: EstimatedFood;
  onChange: (f: EstimatedFood) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = React.useState(false);

  if (!editing) {
    return (
      <Card className="flex items-center gap-3 p-3 transition-all hover:bg-secondary/30">
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-tight">{food.name}</div>
          <div className="text-xs text-muted-foreground">
            {food.quantity} · P{Math.round(food.protein_g)} C
            {Math.round(food.carbs_g)} G{Math.round(food.fat_g)}
          </div>
        </div>
        <div className="stat-number text-sm">{formatKcal(food.calories)}</div>
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

  const set = <K extends keyof EstimatedFood>(k: K, v: EstimatedFood[K]) =>
    onChange({ ...food, [k]: v });

  return (
    <Card className="space-y-2 p-3 border-primary/20">
      <div className="flex items-center gap-2">
        <Input
          value={food.name}
          onChange={(e) => set("name", e.target.value)}
          className="h-10 flex-1"
        />
        <Input
          value={food.quantity}
          onChange={(e) => set("quantity", e.target.value)}
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
          value={food.protein_g}
          onChange={(v) => set("protein_g", v)}
        />
        <NumField
          label="carb"
          value={food.carbs_g}
          onChange={(v) => set("carbs_g", v)}
        />
        <NumField
          label="gord"
          value={food.fat_g}
          onChange={(v) => set("fat_g", v)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" /> Remover
        </Button>
        <Button size="sm" onClick={() => setEditing(false)}>
          Pronto
        </Button>
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
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-10 text-center text-sm"
      />
    </label>
  );
}

function guessMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 17) return "snack";
  if (h < 22) return "dinner";
  return "other";
}
