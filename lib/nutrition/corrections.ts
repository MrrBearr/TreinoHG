/**
 * User-correction memory.
 *
 * Whenever the user saves a meal, we upsert each food entry into
 * `favorite_foods`. The next time the user types something with the same
 * name (or an alias), the resolver pulls those numbers ahead of TACO.
 *
 * The schema reuses the existing `favorite_foods` table:
 *   user_id | name | quantity | calories | protein_g | carbs_g | fat_g | use_count
 *
 * We treat each row as a per-100g density, derived from the saved row by
 * dividing by an inferred grams. When grams can't be inferred (e.g. quantity
 * is "1 unidade" without a known unit_g), we store the row as-is and the
 * resolver will keep using the AI's macros for that food until the user
 * provides an explicit weight at least once.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodCorrection } from "./resolver";
import { parseQuantity, quantityToGrams } from "./parser";

interface FavoriteRow {
  name: string;
  quantity: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export async function loadCorrections(
  supabase: SupabaseClient,
  user_id: string,
  limit = 200,
): Promise<FoodCorrection[]> {
  const { data, error } = await supabase
    .from("favorite_foods")
    .select("name, quantity, calories, protein_g, carbs_g, fat_g, use_count")
    .eq("user_id", user_id)
    .order("use_count", { ascending: false })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return data
    .map(rowToCorrection)
    .filter((c): c is FoodCorrection => c !== null);
}

function rowToCorrection(row: FavoriteRow): FoodCorrection | null {
  // Infer grams from the saved quantity. If we can, store as a per-100g
  // density. Otherwise we have no usable density — drop the row.
  const parsed = parseQuantity(row.quantity ?? "");
  const grams = quantityToGrams(parsed, null);
  if (grams && grams > 0) {
    const factor = 100 / grams;
    return {
      name: row.name,
      density: {
        kcal_per_100: Number(row.calories) * factor,
        protein_per_100: Number(row.protein_g) * factor,
        carbs_per_100: Number(row.carbs_g) * factor,
        fat_per_100: Number(row.fat_g) * factor,
      },
    };
  }
  return null;
}

/**
 * Upsert a single food entry into favorite_foods (one row per user/name).
 * `use_count` is incremented on every save so frequently-eaten items rise
 * to the top of the suggestion list.
 *
 * Never throws; logs and continues on failure.
 */
export async function rememberFoodEntry(
  supabase: SupabaseClient,
  user_id: string,
  entry: FavoriteRow,
): Promise<void> {
  const name = (entry.name || "").trim();
  if (!name) return;

  try {
    // Try update-first to bump use_count atomically; insert only on miss.
    const { data: existing } = await supabase
      .from("favorite_foods")
      .select("id, use_count")
      .eq("user_id", user_id)
      .eq("name", name)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("favorite_foods")
        .update({
          quantity: entry.quantity,
          calories: entry.calories,
          protein_g: entry.protein_g,
          carbs_g: entry.carbs_g,
          fat_g: entry.fat_g,
          use_count: (Number(existing.use_count) || 0) + 1,
        })
        .eq("id", existing.id);
      return;
    }

    await supabase.from("favorite_foods").insert({
      user_id,
      name,
      quantity: entry.quantity,
      calories: entry.calories,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      use_count: 1,
    });
  } catch (err) {
    console.warn(
      "[nutrition:corrections] could not remember food",
      (err as Error).message,
    );
  }
}
