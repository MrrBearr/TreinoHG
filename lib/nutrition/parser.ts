/**
 * Quantity parser for free-text food descriptions.
 *
 * The AI gives us strings like "150g", "2 unidades médias", "1 fatia",
 * "1 prato", "200 ml", "1 colher de sopa". We convert those to grams so
 * the resolver can recompute calories from a per-100g/100ml density.
 *
 * Heuristics — not perfection:
 *  - "Xg" / "X gramas"   → grams = X
 *  - "Xml"                → grams = X (treat 1ml ≈ 1g)
 *  - "X unidade(s)"       → use the food's `unit_g` (default 50)
 *  - "X fatia(s)"         → uses unit_g if defined, else 30g
 *  - "X colher(es) de sopa" → 15g
 *  - "X colher(es) de chá"  → 5g
 *  - "X xícara(s)"          → 150g (sensible default for grains/liquids)
 *  - "X porção" / "X prato" → unit_g if defined, else 200g
 *  - Bare number (e.g. "120") with name like rice/meat → grams (>= 5)
 */

import type { ParsedQuantity, TacoEntry } from "./types";

const NUM_RE =
  /(\d+(?:[.,]\d+)?)/; // 1,5  or 1.5 or 12

const UNIT_PATTERNS: { unit: ParsedQuantity["unit"]; re: RegExp }[] = [
  { unit: "g", re: /\b(g|gr|grama(?:s)?)\b/i },
  { unit: "ml", re: /\b(ml|milil)/i },
  {
    unit: "colher_sopa",
    re: /\bcolher(?:es)? de sopa\b|\bcs\b|\bcolher\.? sopa\b/i,
  },
  {
    unit: "colher_cha",
    re: /\bcolher(?:es)? de cha\b|\bcc\b|\bcolher\.? cha\b/i,
  },
  { unit: "xicara", re: /\bx[ií]cara(?:s)?\b/i },
  { unit: "fatia", re: /\bfatia(?:s)?\b/i },
  { unit: "porcao", re: /\bpor[cç][aã]o(?:e?s)?\b|\bprato(?:s)?\b|\btigela(?:s)?\b/i },
  { unit: "unit", re: /\bunidade(?:s)?\b|\bund\.?(?:s)?\b|\bun\b|\bovos?\b/i },
];

export function parseQuantity(raw: string | null | undefined): ParsedQuantity {
  if (!raw) return { value: 0, unit: "unknown" };
  const text = raw.trim().toLowerCase();
  if (!text) return { value: 0, unit: "unknown" };

  const numMatch = text.match(NUM_RE);
  const value = numMatch ? Number(numMatch[1].replace(",", ".")) : 1;
  if (!Number.isFinite(value) || value <= 0) {
    return { value: 0, unit: "unknown" };
  }

  for (const { unit, re } of UNIT_PATTERNS) {
    if (re.test(text)) return { value, unit };
  }

  // Bare number with no unit → probably grams when value is reasonable.
  if (numMatch && /^\s*\d+(?:[.,]\d+)?\s*$/.test(text)) {
    return { value, unit: value >= 5 ? "g" : "unit" };
  }

  return { value, unit: "unknown" };
}

/**
 * Convert a parsed quantity into grams, using the TACO entry's metadata when
 * helpful (so "1 unidade" of "ovo" → 50g rather than a generic default).
 *
 * Returns `null` when we can't infer grams confidently — caller should keep
 * the AI's calorie estimate rather than recomputing on shaky ground.
 */
export function quantityToGrams(
  q: ParsedQuantity,
  entry: TacoEntry | null,
): number | null {
  if (q.value <= 0) return null;
  switch (q.unit) {
    case "g":
    case "ml":
      return q.value;
    case "unit":
      return q.value * (entry?.unit_g ?? 50);
    case "fatia":
      return q.value * (entry?.unit_g ?? 30);
    case "colher_sopa":
      return q.value * 15;
    case "colher_cha":
      return q.value * 5;
    case "xicara":
      return q.value * 150;
    case "porcao":
      return q.value * (entry?.unit_g ?? 200);
    case "unknown":
      // Bare-number fallback: when we have a TACO entry with a unit_g, treat
      // "2" as "2 unidades". Otherwise we can't safely guess.
      if (entry?.unit_g) return q.value * entry.unit_g;
      return null;
  }
}
