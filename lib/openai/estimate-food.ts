import {
  AIUnavailableError,
  extractJson,
  getOpenAI,
  OPENAI_MODEL,
} from "./client";
import { resolveFoods, type FoodCorrection } from "@/lib/nutrition/resolver";

export interface EstimatedFood {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** Where the numbers came from: favorite | taco | usda | ai. */
  source?: "favorite" | "taco" | "usda" | "ai";
  /** 0..1 — UI hint about how much to trust the numbers. */
  confidence?: number;
}

/**
 * Hybrid food estimator.
 *
 * The AI is now used only as a parser + fallback estimator. After the AI
 * proposes a list of `{ name, quantity, calories, macros }`, the nutrition
 * resolver overrides the kcal/macros from a curated TACO/TBCA dataset (or
 * USDA, or the user's own past corrections) when possible.
 *
 * Behaviour:
 *  - Always resolves; never throws.
 *  - Returns [] when the AI provider is unavailable AND no items were
 *    provided ahead of time.
 *  - Tags each food with the source used so the UI can display provenance.
 */
const SYSTEM_PROMPT = `Você é um nutricionista virtual brasileiro.
A partir de uma descrição em texto livre (em português), identifique os alimentos
e proponha:
  - "name": nome curto do alimento em português
  - "quantity": porção comum se não estiver explícita (ex: "150g", "1 unidade média", "1 fatia")
  - "calories", "protein_g", "carbs_g", "fat_g": estimativa conservadora

Use a tabela TACO/TBCA brasileira como referência sempre que possível.
Identifique até 6 alimentos distintos.

Responda SEMPRE em JSON exatamente neste formato:
{
  "foods": [
    {
      "name": "Ovo cozido",
      "quantity": "2 unidades médias",
      "calories": 156,
      "protein_g": 13,
      "carbs_g": 1,
      "fat_g": 11
    }
  ]
}`;

interface AIRawFood {
  name?: unknown;
  quantity?: unknown;
  calories?: unknown;
  protein?: unknown;
  protein_g?: unknown;
  carbs?: unknown;
  carbs_g?: unknown;
  fat?: unknown;
  fat_g?: unknown;
}

function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 10) / 10);
}

function takeRaw(raw: AIRawFood): {
  name: string;
  quantity: string;
  ai_calories: number;
  ai_protein: number;
  ai_carbs: number;
  ai_fat: number;
} {
  return {
    name: String(raw.name ?? "")
      .slice(0, 120)
      .trim(),
    quantity: String(raw.quantity ?? "").slice(0, 80),
    ai_calories: safeNum(raw.calories),
    ai_protein: safeNum(raw.protein_g ?? raw.protein),
    ai_carbs: safeNum(raw.carbs_g ?? raw.carbs),
    ai_fat: safeNum(raw.fat_g ?? raw.fat),
  };
}

/**
 * Asks the AI to parse the user's text into structured items, then runs the
 * resolver to ground the kcal/macros in real nutrition data.
 *
 * @param query   Free-text description in pt-BR.
 * @param opts.corrections  Optional per-user correction cache to prefer.
 */
export async function estimateFoods(
  query: string,
  opts: { corrections?: FoodCorrection[] } = {},
): Promise<EstimatedFood[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let client;
  try {
    client = getOpenAI();
  } catch (err) {
    if (err instanceof AIUnavailableError) return [];
    console.error("[ai] estimateFoods init failed", err);
    return [];
  }

  let aiItems: ReturnType<typeof takeRaw>[] = [];
  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
      temperature: 0.2,
      max_tokens: 700,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJson<{ foods?: unknown }>(raw);
    if (parsed && Array.isArray(parsed.foods)) {
      aiItems = (parsed.foods as unknown[])
        .slice(0, 6)
        .map((f) => takeRaw((f ?? {}) as AIRawFood))
        .filter((f) => f.name.length > 0);
    }
  } catch (err) {
    console.error("[ai] estimateFoods request failed", err);
  }

  if (aiItems.length === 0) return [];

  const resolved = await resolveFoods(aiItems, {
    corrections: opts.corrections,
  });

  return resolved.map((r) => ({
    name: r.name,
    quantity: r.quantity,
    calories: r.calories,
    protein_g: r.protein_g,
    carbs_g: r.carbs_g,
    fat_g: r.fat_g,
    source: r.source,
    confidence: r.confidence,
  }));
}
