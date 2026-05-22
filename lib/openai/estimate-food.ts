import {
  AIPipelineError,
  AIUnavailableError,
  aiProviderInfo,
  describeAIError,
  extractJson,
  getTextClient,
} from "./client";
import {
  resolveFoods,
  type FoodCorrection,
} from "@/lib/nutrition/resolver";
import {
  extractLeadingQuantity,
  parseQuantity,
  quantityToGrams,
  splitMultiFoodQuery,
} from "@/lib/nutrition/parser";
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
 * The TEXT AI (LLM7 → TEXT_AI fallback) is used as a parser + fallback
 * estimator. After it proposes a list of `{ name, quantity, calories,
 * macros }`, the nutrition resolver overrides the numbers with curated
 * TACO/TBCA data (or USDA, or the user's own past corrections) when
 * possible.
 *
 * Failure modes — each handled deliberately:
 *  - AI provider not configured (no key): try TACO/USDA on the raw query
 *    so the user still gets known foods. If even that misses, throw
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
 * Asks the TEXT AI to parse the user's text into structured items, then
 * runs the resolver to ground the kcal/macros in real nutrition data.
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

  // ============== 0) Multi-food fast path ==============
  // "arroz 237g feijão 83g frango 412g" must split into THREE entries with
  // their exact quantities preserved — never one merged item, never a
  // 100g fallback. We do this deterministically before any AI call so the
  // result is independent of provider availability or parsing quality.
  const multi = splitMultiFoodQuery(trimmed);
  if (multi && multi.length >= 2) {
    try {
      const resolved = await resolveFoods(multi, {
        corrections: opts.corrections,
      });
      // Belt-and-braces: echo the user's typed quantity verbatim per item,
      // even if the resolver canonicalised it during materialisation.
      return resolved.map((r, i) => ({
        ...toEstimated(r),
        quantity: multi[i].quantity,
      }));
    } catch (err) {
      // Resolver crash should not erase the split — fall back to AI macros
      // of zero so the user can edit. The split itself is still useful.
      console.error(
        "[ai:estimateFoods] resolver crashed on multi-food split:",
        describeAIError(err),
      );
      return multi.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        source: "ai",
        confidence: 0.4,
      }));
    }
  }

  // Detect an explicit leading quantity ("300g", "2 unidades", "1 fatia")
  // so we can pin it through every downstream step. The user's typed
  // quantity is authoritative — we never normalise it to 100g, even when
  // the AI prefers a different portion size.
  const userQty = extractLeadingQuantity(trimmed);

  // ============== 1) AI parse pass ==============
  const aiResult = await runAIParse(trimmed);

  // Lock the user's quantity in place when the query is a single-item
  // request like "300g arroz". Multi-item queries ("2 ovos e 100g arroz")
  // are left alone so the AI can attribute each quantity to the right food.
  if (userQty && aiResult.items.length === 1) {
    aiResult.items[0] = pinUserQuantity(aiResult.items[0], userQty);
  }

  // ============== 2) Resolve AI items, when present ==============
  if (aiResult.items.length > 0) {
    try {
      const resolved = await resolveFoods(aiResult.items, {
        corrections: opts.corrections,
      });
      // Belt-and-braces: if the user typed a quantity, it must come back
      // unchanged in the rendered output, regardless of what the resolver
      // chose to display (e.g. when it canonicalises an alias).
      if (userQty && resolved.length === 1) {
        resolved[0] = { ...resolved[0], quantity: userQty };
      }
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
  //
  // Important: we use the user's typed quantity when present (so "300g
  // arroz" stays 300g). The "100g" string is ONLY used as an internal
  // scaling default when the user did not supply a quantity at all — it
  // never overwrites a typed value.
  const fallback = await resolveFoods(
    [
      {
        name: trimmed,
        quantity: userQty ?? "100g",
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
    // If the user typed a quantity, echo it verbatim — never replace.
    const display = userQty ?? first.quantity;
    return [toEstimated({ ...first, quantity: display })];
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
  let handle;
  try {
    handle = getTextClient();
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      console.warn(
        "[ai:estimateFoods] text provider unavailable:",
        describeAIError(err),
      );
      return { items: [], error: { reason: "unavailable", message: err.message } };
    }
    const msg = describeAIError(err);
    console.error("[ai:estimateFoods] text provider init failed:", msg);
    return { items: [], error: { reason: "failed", message: msg } };
  }

  const provider = aiProviderInfo("text");
  const t0 = Date.now();
  try {
    const completion = await handle.client.chat.completions.create({
      model: handle.model,
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
      `[ai:estimateFoods] ok in ${elapsed}ms (provider=${provider.provider}, model=${provider.model}, len=${raw.length})`,
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
      `[ai:estimateFoods] request failed after ${elapsed}ms (provider=${provider.provider}, model=${provider.model}): ${msg}`,
    );
    return { items: [], error: { reason: "failed", message: msg } };
  }
}

function round1(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10) / 10;
}

/**
 * Replace the AI item's quantity with the user's exact typed value, and
 * proportionally rescale the AI's macro hints to the new mass so the
 * resolver's downstream computations stay consistent.
 *
 * Worked example: AI returns { quantity: "100g", calories: 128 } for
 * "arroz" but the user typed "300g". We pin quantity → "300g" and scale
 * macros × 3 so a) if the resolver finds a TACO match it computes 384 kcal
 * directly from density × 300g, and b) if there's no match the AI fallback
 * still reports 384 kcal instead of 128.
 *
 * When grams can't be inferred for either side (e.g. "1 prato" with no
 * unit_g hint) we keep the AI's macros as-is — better than zeroing them.
 */
function pinUserQuantity(
  item: ParsedAIItem,
  userQty: string,
): ParsedAIItem {
  const aiGrams = quantityToGrams(parseQuantity(item.quantity), null);
  const userGrams = quantityToGrams(parseQuantity(userQty), null);
  const scale =
    aiGrams && userGrams && aiGrams > 0 ? userGrams / aiGrams : 1;
  return {
    ...item,
    quantity: userQty,
    ai_calories: item.ai_calories * scale,
    ai_protein: item.ai_protein * scale,
    ai_carbs: item.ai_carbs * scale,
    ai_fat: item.ai_fat * scale,
  };
}
