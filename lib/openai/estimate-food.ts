import {
  AIUnavailableError,
  extractJson,
  getOpenAI,
  OPENAI_MODEL,
} from "./client";

export interface EstimatedFood {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const SYSTEM_PROMPT = `Você é um nutricionista virtual.
A partir de uma descrição em texto livre (em português brasileiro), identifique os alimentos
e estime calorias e macros para a porção descrita. Use a tabela TACO/IBGE quando aplicável.

Regras:
- Identifique até 6 alimentos distintos.
- Se a quantidade não estiver clara, sugira uma porção comum (ex: "120g", "1 unidade média", "1 fatia").
- Todos os campos numéricos devem ser números (não strings).
- Seja conservador; é melhor subestimar a mais a calorias.

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

function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 10) / 10);
}

function sanitize(f: unknown): EstimatedFood {
  const obj = (f ?? {}) as Record<string, unknown>;
  return {
    name: String(obj.name ?? "").slice(0, 120).trim() || "Alimento",
    quantity: String(obj.quantity ?? "").slice(0, 80),
    calories: safeNum(obj.calories),
    protein_g: safeNum(obj.protein_g ?? obj.protein),
    carbs_g: safeNum(obj.carbs_g ?? obj.carbs),
    fat_g: safeNum(obj.fat_g ?? obj.fat),
  };
}

/**
 * Estimates one or more foods from a free-text description. Always resolves
 * — never throws — so callers can render a graceful fallback. Returns an
 * empty array when the AI provider is unavailable or returns malformed JSON.
 */
export async function estimateFoods(query: string): Promise<EstimatedFood[]> {
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
    if (!parsed || !Array.isArray(parsed.foods)) return [];

    return (parsed.foods as unknown[])
      .slice(0, 6)
      .map(sanitize)
      .filter((f) => f.name);
  } catch (err) {
    console.error("[ai] estimateFoods failed", err);
    return [];
  }
}
