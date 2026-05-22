/**
 * Hybrid nutrition resolver.
 *
 * Pipeline for a single AI-detected (or user-typed) food:
 *
 *   1. Parse free-text quantity → grams (parser.ts)
 *   2. Try TACO/TBCA local dataset by normalised name
 *   3. If TACO miss, try USDA FoodData Central (fallback, requires env key)
 *   4. If still nothing, keep the AI's own kcal/macros estimate
 *   5. Apply user-correction cache last so personal overrides always win
 *
 * The function ALWAYS resolves with a `ResolvedFood` that's safe to render.
 * Each step is wrapped so a single failure can't poison the whole batch.
 */

import { findTacoEntry } from "./taco";
import { parseQuantity, quantityToGrams } from "./parser";
import { lookupUSDA } from "./usda";
import type {
  NutrientDensity,
  NutritionSource,
  ResolvedFood,
} from "./types";

interface RawFoodInput {
  name: string;
  quantity: string;
  /** AI's own initial guess. Used when no DB hit is possible. */
  ai_calories?: number;
  ai_protein?: number;
  ai_carbs?: number;
  ai_fat?: number;
}

/** A user correction loaded from `favorite_foods`. */
export interface FoodCorrection {
  name: string;
  /** User's saved per-100g (or per-unit) values. */
  density: NutrientDensity;
  /** Optional "1 unit weight" the user historically uses. */
  unit_g?: number;
}

export interface ResolveOptions {
  /**
   * Per-user correction cache. Pass the user's favorite_foods rows here so
   * past edits are reused. The resolver will match by normalised name.
   */
  corrections?: FoodCorrection[];
  /**
   * Disable network calls (USDA). Useful when we know the env key isn't
   * set, or for offline tests.
   */
  skipUSDA?: boolean;
}

const SOURCE_CONFIDENCE: Record<NutritionSource, number> = {
  favorite: 0.95,
  taco: 0.85,
  usda: 0.7,
  ai: 0.5,
};

/** Public entry point. Resolves N foods in parallel. */
export async function resolveFoods(
  items: RawFoodInput[],
  options: ResolveOptions = {},
): Promise<ResolvedFood[]> {
  // Per-item guard so one bad input can't crash the whole batch.
  return Promise.all(
    items.map(async (it) => {
      try {
        return await resolveSingle(it, options);
      } catch (err) {
        console.error(
          "[nutrition:resolver] resolveSingle crashed, falling back to AI numbers:",
          (err as Error)?.message ?? err,
        );
        return aiFallback(it, "ai");
      }
    }),
  );
}

async function resolveSingle(
  item: RawFoodInput,
  options: ResolveOptions,
): Promise<ResolvedFood> {
  const cleanName = (item.name || "").trim();
  if (!cleanName) {
    return aiFallback(item, "ai");
  }

  const parsedQty = parseQuantity(item.quantity);

  // 1) User correction cache — highest priority once the user has personally
  //    saved this food before.
  const correction = options.corrections
    ? findCorrection(cleanName, options.corrections)
    : null;
  if (correction) {
    const grams = quantityToGrams(parsedQty, {
      name: correction.name,
      aliases: [correction.name],
      kcal_per_100: correction.density.kcal_per_100,
      protein_per_100: correction.density.protein_per_100,
      carbs_per_100: correction.density.carbs_per_100,
      fat_per_100: correction.density.fat_per_100,
      unit_g: correction.unit_g,
    });
    if (grams !== null) {
      return materialize(item, "favorite", correction.density, grams);
    }
    // Couldn't extract grams from quantity — the correction is still useful
    // as a name hint but we trust AI's macro numbers for now.
  }

  // 2) TACO / TBCA local dataset.
  const taco = findTacoEntry(cleanName);
  if (taco) {
    const grams = quantityToGrams(parsedQty, taco);
    if (grams !== null) {
      return materialize(
        { ...item, name: taco.name },
        "taco",
        {
          kcal_per_100: taco.kcal_per_100,
          protein_per_100: taco.protein_per_100,
          carbs_per_100: taco.carbs_per_100,
          fat_per_100: taco.fat_per_100,
        },
        grams,
      );
    }
    // We know the food but not the grams — cross-validate AI's calories
    // against TACO's per-100g density (assume a typical 100g portion). If
    // AI's number is wildly off (>2x or <0.5x), clamp it; otherwise pass
    // through as-is. This keeps obvious typos from leaking into history.
    return validateAI(item, taco);
  }

  // 3) USDA fallback (if configured).
  if (!options.skipUSDA) {
    const usda = await safe(() => lookupUSDA(cleanName));
    if (usda) {
      const grams = quantityToGrams(parsedQty, null);
      if (grams !== null) {
        return materialize(item, "usda", usda, grams);
      }
      // Have density but no grams — clamp AI's calories with USDA's density
      // assuming 100g, same as the TACO branch above.
      return validateAI(item, {
        kcal_per_100: usda.kcal_per_100,
        protein_per_100: usda.protein_per_100,
        carbs_per_100: usda.carbs_per_100,
        fat_per_100: usda.fat_per_100,
      });
    }
  }

  // 4) AI fallback.
  return aiFallback(item, "ai");
}

/** Compute final macros from a per-100g/100ml density and a known mass. */
function materialize(
  item: RawFoodInput,
  source: NutritionSource,
  density: NutrientDensity,
  grams: number,
): ResolvedFood {
  const factor = grams / 100;
  return {
    name: item.name,
    quantity: item.quantity,
    calories: round0(density.kcal_per_100 * factor),
    protein_g: round1(density.protein_per_100 * factor),
    carbs_g: round1(density.carbs_per_100 * factor),
    fat_g: round1(density.fat_per_100 * factor),
    source,
    confidence: SOURCE_CONFIDENCE[source],
  };
}

/** Pass-through using AI's own estimate. */
function aiFallback(
  item: RawFoodInput,
  source: NutritionSource,
): ResolvedFood {
  return {
    name: item.name,
    quantity: item.quantity,
    calories: round0(item.ai_calories ?? 0),
    protein_g: round1(item.ai_protein ?? 0),
    carbs_g: round1(item.ai_carbs ?? 0),
    fat_g: round1(item.ai_fat ?? 0),
    source,
    confidence: SOURCE_CONFIDENCE[source],
  };
}

/**
 * Cross-check AI's macros against a known density (assuming 100g portion).
 * Clamp obvious outliers; otherwise keep AI numbers but tag as `ai` so the
 * UI doesn't claim a database-backed match it can't justify.
 */
function validateAI(
  item: RawFoodInput,
  density: NutrientDensity,
): ResolvedFood {
  const reference = density.kcal_per_100; // assumes 100g default portion
  const aiKcal = Number(item.ai_calories ?? 0);
  // Implausibly high: more than 2.5× the per-100g reference for the named
  // food. Clamp to a sensible double so the user isn't surprised by 1500
  // kcal for a salad.
  let calories = aiKcal;
  if (aiKcal > reference * 2.5 && aiKcal > 50) {
    calories = Math.round(reference * 1.2);
  } else if (aiKcal < reference * 0.3 && reference > 30) {
    calories = Math.round(reference * 0.5);
  }
  return {
    name: item.name,
    quantity: item.quantity,
    calories: round0(calories),
    protein_g: round1(item.ai_protein ?? density.protein_per_100),
    carbs_g: round1(item.ai_carbs ?? density.carbs_per_100),
    fat_g: round1(item.ai_fat ?? density.fat_per_100),
    source: "ai",
    confidence: SOURCE_CONFIDENCE.ai,
  };
}

function findCorrection(
  name: string,
  list: FoodCorrection[],
): FoodCorrection | null {
  const norm = normalize(name);
  if (!norm) return null;
  for (const c of list) {
    if (!c?.name) continue;
    if (normalize(c.name) === norm) return c;
  }
  // Substring fallback so "frango grelhado" matches a saved "frango".
  for (const c of list) {
    if (!c?.name) continue;
    const cn = normalize(c.name);
    if (cn && (norm.includes(cn) || cn.includes(norm))) return c;
  }
  return null;
}

function normalize(s: string | null | undefined): string {
  if (!s || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function round0(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function round1(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10) / 10;
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
