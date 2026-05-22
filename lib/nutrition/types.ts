/**
 * Shared types for the nutrition resolver pipeline.
 *
 * The resolver merges three sources, in priority order:
 *
 *   1. user-correction cache (favorite_foods rows the user has saved before)
 *   2. TACO/TBCA — local Brazilian food composition tables (built-in)
 *   3. USDA FoodData Central — fallback for generic ingredients
 *   4. AI — last resort for items nothing else recognized
 *
 * Calling code receives a flat `ResolvedFood[]` regardless of which source
 * produced each item, plus a `source` tag so the UI can show provenance.
 */

export type NutritionSource = "favorite" | "taco" | "usda" | "ai";

/** Per-100g nutrient profile, the canonical shape used inside the resolver. */
export interface NutrientDensity {
  /** kcal per 100g (or 100ml for liquids — see `is_liquid`). */
  kcal_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
}

/** A food matched in the local TACO/TBCA dataset. */
export interface TacoEntry extends NutrientDensity {
  /** Canonical pt-BR display name. */
  name: string;
  /** Lower-case, accent-normalised aliases used for matching. */
  aliases: readonly string[];
  /**
   * Default mass in grams used when the user supplies a count but no weight
   * (e.g. "2 ovos" → 50g per egg → 100g). Optional: only foods that have a
   * common discrete unit (egg, slice, tablespoon-of-X) need this.
   */
  unit_g?: number;
  /** Treat ml ≈ g for milk, juice, soup etc. */
  is_liquid?: boolean;
}

/** A parsed quantity expression like "150g" or "2 unidades". */
export interface ParsedQuantity {
  /** Numeric value, never negative. */
  value: number;
  /** Normalised unit token: "g", "ml", "unit", "fatia", "colher_sopa", "colher_cha", "xicara", "porcao", "unknown". */
  unit:
    | "g"
    | "ml"
    | "unit"
    | "fatia"
    | "colher_sopa"
    | "colher_cha"
    | "xicara"
    | "porcao"
    | "unknown";
}

/** Final shape returned by the resolver, used by the UI and the actions layer. */
export interface ResolvedFood {
  name: string;
  /** Free-text quantity exactly as the user typed (or AI proposed). */
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** Where the numbers came from. */
  source: NutritionSource;
  /** 0..1 — higher means we trust the numbers more. */
  confidence: number;
}
