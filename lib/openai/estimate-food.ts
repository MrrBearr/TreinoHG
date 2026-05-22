import {
  AIPipelineError,
  AIUnavailableError,
  aiProviderInfo,
  describeAIError,
  extractJson,
  getOpenAI,
  OPENAI_MODEL,
} from "./client";
import {
  resolveFoods,
  type FoodCorrection,
} from "@/lib/nutrition/resolver";
import type { ResolvedFood } from "@/lib/nutrition/types";

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
 * The AI is used as a parser + fallback estimator. After the AI proposes a
 * list of `{ name, quantity, calories, macros }`, the nutrition resolver
 * overrides the numbers with curated TACO/TBCA data (or USDA, or the
 * user's own past corrections) when possible.
 *
 * Failure modes — each handled deliberately:
 *  - AI provider not configured (no API key): try TACO/USDA on the raw
 *    query so the user still gets known foods. If even that misses, throw
 *    AIPipelineError("unavailable") so the route returns a clean 503.
 *  - AI request fails (network / 5xx / bad model): same fallback as above,
 *    but throw AIPipelineError("failed") on total miss.
 *  - AI succeeds with empty foods: try the raw-query fallback so a known
 *    Brazilian food still resolves; otherwise return [] (this is a real
 *    "I don't know" answer, not a hidden error).
 *  - AI succeeds with N items: resolver runs as designed; always returns
 *    items even if every one of them used the AI fallback.
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

interface ParsedAIItem {
  name: string;
  quantity: string;
  ai_calories: number;
  ai_protein: number;
  ai_carbs: number;
  ai_fat: number;
}

function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 10) / 10);
}

function takeRaw(raw: AIRawFood): ParsedAIItem {
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

function toEstimated(r: ResolvedFood): EstimatedFood {
  return {
    name: r.name,
    quantity: r.quantity,
    calories: r.calories,
    protein_g: r.protein_g,
    carbs_g: r.carbs_g,
    fat_g: r.fat_g,
    source: r.source,
    confidence: r.confidence,
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

  // ============== 1) AI parse pass ==============
  const aiResult = await runAIParse(trimmed);

  // ============== 2) Resolve AI items, when present ==============
  if (aiResult.items.length > 0) {
    try {
      const resolved = await resolveFoods(aiResult.items, {
        corrections: opts.corrections,
      });
      return resolved.map(toEstimated);
    } catch (err) {
      // Resolver should be self-healing, but never let a TACO/USDA bug
      // erase a working AI response. Fall back to the AI numbers as-is.
      console.error(
        "[ai:estimateFoods] resolver crashed, returning raw AI items:",
        describeAIError(err),
      );
      return aiResult.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        calories: Math.round(it.ai_calories),
        protein_g: round1(it.ai_protein),
        carbs_g: round1(it.ai_carbs),
        fat_g: round1(it.ai_fat),
        source: "ai",
        confidence: 0.5,
      }));
    }
  }

  // ============== 3) AI parse miss — try the raw query as a single food ==============
  // This is what makes the resolver USEFUL when the AI provider is broken,
  // misconfigured, or just returned junk. A user typing "frango grelhado"
  // still gets TACO data even with no AI at all.
  const fallback = await resolveFoods(
    [
      {
        name: trimmed,
        quantity: "100g", // assume a single 100g serving when no quantity given
      },
    ],
    { corrections: opts.corrections },
  ).catch((err) => {
    console.error(
      "[ai:estimateFoods] resolver crashed on raw fallback:",
      describeAIError(err),
    );
    return [] as ResolvedFood[];
  });

  const first = fallback[0];
  if (first && first.source !== "ai" && first.calories > 0) {
    return [toEstimated(first)];
  }

  // ============== 4) Nothing worked. Surface real errors to the route. ==============
  if (aiResult.error) {
    throw new AIPipelineError(aiResult.error.reason, aiResult.error.message);
  }

  // AI genuinely returned zero items and TACO didn't recognise the query.
  // Empty array is the right answer; the route will return 200 and the UI
  // can prompt the user to type something more specific.
  return [];
}

/* ---------------------------------------------------------------------- */
/* Internal: run the AI parse step, capturing the full failure mode         */
/* ---------------------------------------------------------------------- */

interface AIParseResult {
  items: ParsedAIItem[];
  error: { reason: "unavailable" | "failed"; message: string } | null;
}

async function runAIParse(query: string): Promise<AIParseResult> {
  let client;
  try {
    client = getOpenAI();
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      console.warn(
        "[ai:estimateFoods] provider unavailable:",
        describeAIError(err),
      );
      return { items: [], error: { reason: "unavailable", message: err.message } };
    }
    const msg = describeAIError(err);
    console.error("[ai:estimateFoods] provider init failed:", msg);
    return { items: [], error: { reason: "failed", message: msg } };
  }

  const provider = aiProviderInfo();
  const t0 = Date.now();
  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      temperature: 0.2,
      max_tokens: 700,
    });

    const elapsed = Date.now() - t0;
    const raw = completion.choices[0]?.message?.content ?? "";
    console.info(
      `[ai:estimateFoods] ok in ${elapsed}ms (model=${provider.model}, base=${provider.baseUrl}, len=${raw.length})`,
    );

    const parsed = extractJson<{ foods?: unknown }>(raw);
    if (!parsed || !Array.isArray(parsed.foods)) {
      console.warn(
        "[ai:estimateFoods] response did not contain a foods array — preview:",
        raw.slice(0, 200),
      );
      return {
        items: [],
        error: {
          reason: "failed",
          message: "Resposta da IA em formato inesperado.",
        },
      };
    }

    const items = (parsed.foods as unknown[])
      .slice(0, 6)
      .map((f) => takeRaw((f ?? {}) as AIRawFood))
      .filter((f) => f.name.length > 0);
    return { items, error: null };
  } catch (err) {
    const elapsed = Date.now() - t0;
    const msg = describeAIError(err);
    console.error(
      `[ai:estimateFoods] request failed after ${elapsed}ms (model=${provider.model}, base=${provider.baseUrl}): ${msg}`,
    );
    return { items: [], error: { reason: "failed", message: msg } };
  }
}

function round1(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10) / 10;
}
