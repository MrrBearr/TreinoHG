/**
 * USDA FoodData Central client.
 *
 * Used as a fallback when the local TACO/TBCA dataset doesn't recognize a
 * food. Requires `USDA_API_KEY` to be set in the environment — a free key
 * can be requested at https://fdc.nal.usda.gov/api-key-signup.html.
 *
 * We translate the user's pt-BR query to a small English vocabulary before
 * hitting the API, since FDC is English-only. The translation map covers
 * the most common ingredients people log when they fall through TACO.
 *
 * The function ALWAYS resolves; on any error (no key, network, malformed
 * response) it returns `null` so the resolver can move on to the AI step.
 */

import type { NutrientDensity } from "./types";

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";

/** Cheap pt-BR → en map for FDC. Only enough words to cover common fallbacks. */
const PT_TO_EN: Record<string, string> = {
  arroz: "rice",
  feijao: "beans",
  feijão: "beans",
  frango: "chicken",
  carne: "beef",
  carne_bovina: "beef",
  porco: "pork",
  peixe: "fish",
  ovo: "egg",
  leite: "milk",
  queijo: "cheese",
  iogurte: "yogurt",
  pao: "bread",
  pão: "bread",
  banana: "banana",
  maca: "apple",
  maçã: "apple",
  laranja: "orange",
  manga: "mango",
  abacate: "avocado",
  morango: "strawberry",
  alface: "lettuce",
  tomate: "tomato",
  cenoura: "carrot",
  brocolis: "broccoli",
  couve: "kale",
  batata: "potato",
  azeite: "olive oil",
  manteiga: "butter",
  cafe: "coffee",
  café: "coffee",
  refrigerante: "soda",
  cerveja: "beer",
  acucar: "sugar",
  açúcar: "sugar",
  pasta_de_amendoim: "peanut butter",
  amendoim: "peanut",
  castanha: "brazil nut",
  aveia: "oats",
  granola: "granola",
  whey: "whey protein",
  proteina: "protein",
};

function ptToEnglishQuery(input: string): string {
  const norm = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const words = norm.split(/\s+/);
  const translated = words.map((w) => PT_TO_EN[w] ?? w);
  return translated.join(" ").trim();
}

interface FdcSearchResponse {
  foods?: {
    description: string;
    foodNutrients?: { nutrientName?: string; nutrientNumber?: string; value?: number }[];
  }[];
}

/** Lookup a food by free-text name. Returns null if unavailable or unmatched. */
export async function lookupUSDA(
  name: string,
): Promise<NutrientDensity | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return null;

  const query = ptToEnglishQuery(name);
  if (query.length < 3) return null;

  const url = new URL(`${FDC_BASE}/foods/search`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "1");
  url.searchParams.set(
    "dataType",
    "Foundation,SR Legacy,Survey (FNDDS)",
  );

  try {
    const res = await fetch(url.toString(), {
      // Network call from a server route — avoid Next caching, FDC values
      // are stable but we don't want a stale per-edge cache surprise.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as FdcSearchResponse;
    const food = json.foods?.[0];
    if (!food) return null;

    // Standard USDA nutrient numbers. Values come back per 100g.
    const find = (numbers: string[]): number => {
      const n = food.foodNutrients?.find((x) =>
        numbers.includes(x.nutrientNumber ?? ""),
      );
      return Number(n?.value ?? 0) || 0;
    };

    const kcal = find(["208", "1008"]); // Energy
    const protein = find(["203", "1003"]);
    const carbs = find(["205", "1005"]);
    const fat = find(["204", "1004"]);

    // Sanity: a hit with zero everywhere is useless.
    if (kcal <= 0 && protein <= 0 && carbs <= 0 && fat <= 0) return null;

    return {
      kcal_per_100: round1(kcal),
      protein_per_100: round1(protein),
      carbs_per_100: round1(carbs),
      fat_per_100: round1(fat),
    };
  } catch (err) {
    console.warn("[nutrition:usda] lookup failed:", (err as Error).message);
    return null;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
