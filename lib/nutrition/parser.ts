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
  let text = raw.trim().toLowerCase();
  if (!text) return { value: 0, unit: "unknown" };

  // Normalise "150g" / "100ml" / "1fatia" into "150 g" / "100 ml" / "1 fatia"
  // so the \b-anchored unit regexes actually match. Without this, digits and
  // their adjacent unit are part of the same word and \b never fires —
  // every "150g" silently ended up as `unknown` and bypassed TACO.
  text = text.replace(/(\d)([a-zçáàãâéêíóôõúü])/gi, "$1 $2");

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
 * Detects a quantity expression at the START of a free-text query so we can
 * preserve the *user's exact typed quantity* through the AI pipeline.
 *
 *   "300g arroz"            → "300g"
 *   "150 g de frango"       → "150 g"
 *   "2 unidades de banana"  → "2 unidades"
 *   "1 fatia de pão"        → "1 fatia"
 *   "1.5kg de arroz"        → "1.5kg"
 *   "frango grelhado"       → null   (no quantity prefix)
 *   "300 arroz"             → null   (number without a unit — ambiguous)
 *
 * Returns the matched substring exactly as the user typed it (whitespace,
 * casing) so we can echo it back to the UI without normalising. Returns
 * null when no recognisable quantity is at the start.
 *
 * Used by the server-side estimator to lock the user's mass in place
 * BEFORE the AI's preferred portion can override it.
 */
const LEADING_QTY_RE =
  /^\s*(\d+(?:[.,]\d+)?\s*(?:kg|gr|g|ml|gramas?|mililitros?|unidades?|und\.?s?|un|ovos?|fatias?|colher(?:es)?\s+de\s+\w+|cs|cc|x[ií]caras?|porç\w+s?|pratos?|tigelas?))(?=\s|$|de\s)/i;

export function extractLeadingQuantity(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const m = input.match(LEADING_QTY_RE);
  if (!m) return null;
  const captured = m[1].trim();
  // Sanity: the capture must contain at least one digit.
  if (!/\d/.test(captured)) return null;
  return captured;
}

/**
 * Split a free-text query containing two or more "food + quantity" pairs
 * into separate items, deterministically — no AI required.
 *
 * Handles both directions:
 *   "arroz 237g feijão 83g frango 412g"
 *      → [{arroz, 237g}, {feijão, 83g}, {frango, 412g}]
 *   "237g arroz e 83g feijão"
 *      → [{arroz, 237g}, {feijão, 83g}]
 *   "2 fatias de pão e 100g manteiga"
 *      → [{pão, 2 fatias}, {manteiga, 100g}]
 *
 * Returns null when there are fewer than two recognisable quantities, so
 * the caller can route single-food queries through the existing AI/TACO
 * pipeline instead.
 *
 * Notes
 * -----
 *   - We deliberately leave "ovos" out of this regex (unlike parseQuantity)
 *     because a phrase like "2 ovos" is BOTH the food name AND the unit;
 *     splitting on it loses the food name. Single-food queries with eggs
 *     keep working through the AI / single-food TACO path.
 *   - Connector words ("e", "com", "de", commas, semicolons) are stripped
 *     from extracted names so we don't end up with "e arroz" or " arroz".
 *   - Direction is detected from whether the first quantity is preceded by
 *     letters: "name qty name qty …" vs "qty name qty name …".
 */
const MULTI_QTY_RE =
  /(\d+(?:[.,]\d+)?)\s*(kg|gramas?|gr|g|mililitros?|ml|unidades?|und\.?s?|un|fatias?|colher(?:es)?\s+de\s+\w+|cs|cc|x[ií]caras?|porç\w+s?|pratos?|tigelas?)/gi;

export function splitMultiFoodQuery(
  input: string | null | undefined,
): Array<{ name: string; quantity: string }> | null {
  if (!input) return null;

  // Collect every quantity match with its slice positions in the original
  // string so we can carve names out of the surrounding text.
  const matches: { start: number; end: number; text: string }[] = [];
  const re = new RegExp(MULTI_QTY_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      text: m[0].replace(/\s+/g, " ").trim(),
    });
  }

  if (matches.length < 2) return null;

  // "Name first" when there are letters BEFORE the first quantity match.
  const beforeFirstQty = input.slice(0, matches[0].start);
  const nameFirst =
    /[a-zçáàãâéêíóôõúü]/i.test(beforeFirstQty) &&
    beforeFirstQty.trim().length >= 2;

  const items: { name: string; quantity: string }[] = [];

  if (nameFirst) {
    // "name1 qty1 name2 qty2 … nameN qtyN" — name precedes its quantity.
    let cursor = 0;
    for (const qty of matches) {
      const name = cleanFoodFragment(input.slice(cursor, qty.start));
      if (name) items.push({ name, quantity: qty.text });
      cursor = qty.end;
    }
  } else {
    // "qty1 name1 qty2 name2 … qtyN nameN" — quantity precedes its name.
    for (let i = 0; i < matches.length; i++) {
      const qty = matches[i];
      const nextStart =
        i + 1 < matches.length ? matches[i + 1].start : input.length;
      const name = cleanFoodFragment(input.slice(qty.end, nextStart));
      if (name) items.push({ name, quantity: qty.text });
    }
  }

  return items.length >= 2 ? items : null;
}

function cleanFoodFragment(raw: string): string {
  let s = raw.replace(/[,;.]/g, " ");
  // Strip standalone Portuguese connector words. We use zero-width
  // lookbehind/lookahead instead of `\b` because:
  //   1. JS `\b` is ASCII-only — `\bo\b` matches the trailing "o" of
  //      "feijão" / "pão" (since "ã" isn't a word char), corrupting names.
  //   2. Consuming `\s` on both sides prevents stripping back-to-back
  //      connectors like "e o" because the shared space is eaten by the
  //      first match. Lookbehind/lookahead leave the whitespace in place
  //      so each connector is matched independently.
  s = s.replace(
    /(?<=^|\s)(de|da|do|com|sem|e|o|a|os|as|um|uma|no|na|em)(?=\s|$)/gi,
    "",
  );
  return s.replace(/\s+/g, " ").trim();
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
