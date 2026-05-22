import {
  AIUnavailableError,
  aiProviderInfo,
  describeAIError,
  extractJson,
  getVisionClient,
} from "./client";
import { withCoachPersonality } from "@/lib/coach/personalities";
import type { AIDetectedFood } from "@/types/database";

export interface PhotoAnalysisResult {
  foods: AIDetectedFood[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  confidence: number;
  summary: string;
  /** Set to true when the AI call or parsing failed and a fallback shape was used. */
  fallback?: boolean;
}

const SYSTEM_BASE = `Você é um nutricionista virtual que analisa fotos de refeições.
Identifique cada alimento visível na imagem, estime a quantidade em gramas ou unidades,
e calcule calorias e macronutrientes (proteína, carboidrato, gordura) com base em tabelas
nutricionais brasileiras (TACO/IBGE) quando possível.

Responda SEMPRE em JSON válido com este formato exato:
{
  "foods": [
    {
      "name": "Nome do alimento em português",
      "estimated_quantity": "ex: 120g, 1 unidade média, 1 fatia",
      "calories": 156,
      "protein": 3,
      "carbs": 34,
      "fat": 1
    }
  ],
  "total_calories": 540,
  "total_protein": 42,
  "total_carbs": 48,
  "total_fat": 12,
  "confidence": 0.87,
  "summary": "Frase curta em português descrevendo a refeição."
}

Regras importantes:
- Todos os valores numéricos devem ser números (não strings).
- "confidence" entre 0 e 1.
- Se a imagem não for uma refeição, retorne foods vazio e summary explicando.
- Use sempre português brasileiro nos nomes e no resumo.
- Seja conservador nas estimativas; é melhor subestimar que superestimar drasticamente.
- O campo "summary" deve respeitar a personalidade de coach indicada abaixo.`;

function emptyResult(summary: string): PhotoAnalysisResult {
  return {
    foods: [],
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    confidence: 0,
    summary,
    fallback: true,
  };
}

function sanitize(parsed: Partial<PhotoAnalysisResult>): PhotoAnalysisResult {
  const foods = Array.isArray(parsed.foods) ? parsed.foods : [];
  return {
    foods: foods.map((f) => ({
      name: String((f as AIDetectedFood)?.name ?? "Alimento"),
      estimated_quantity: String(
        (f as AIDetectedFood)?.estimated_quantity ?? "",
      ),
      calories: safeNumber((f as AIDetectedFood)?.calories),
      protein: safeNumber((f as AIDetectedFood)?.protein),
      carbs: safeNumber((f as AIDetectedFood)?.carbs),
      fat: safeNumber((f as AIDetectedFood)?.fat),
    })),
    total_calories: safeNumber(parsed.total_calories),
    total_protein: safeNumber(parsed.total_protein),
    total_carbs: safeNumber(parsed.total_carbs),
    total_fat: safeNumber(parsed.total_fat),
    confidence: clamp01(safeNumber(parsed.confidence)),
    summary: String(parsed.summary ?? ""),
  };
}

function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Analyzes a meal photo and returns a structured result.
 *
 * Provider: VISION channel — NVIDIA NIM via getVisionClient(). The endpoint
 * is OpenAI-compatible so the same chat-completions wire format works.
 *
 * Always resolves — never throws — returning a fallback shape with
 * `fallback: true` when the provider is unavailable or the response is
 * malformed. The route layer surfaces this as a 503 to the client.
 */
export async function analyzeMealPhoto(
  imageDataUrlOrUrl: string,
  options: { personality?: string | null } = {},
): Promise<PhotoAnalysisResult> {
  let handle;
  try {
    handle = getVisionClient();
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      console.warn(
        `[ai:analyze-photo] vision provider unavailable: ${describeAIError(err)}`,
      );
      return emptyResult(
        "IA de imagem indisponível no momento. Adicione os alimentos manualmente.",
      );
    }
    console.error(
      `[ai:analyze-photo] vision provider init failed: ${describeAIError(err)}`,
    );
    return emptyResult(
      "Falha ao iniciar a análise. Tente novamente ou adicione manualmente.",
    );
  }

  const provider = aiProviderInfo("vision");
  const t0 = Date.now();
  try {
    const completion = await handle.client.chat.completions.create({
      model: handle.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: withCoachPersonality(SYSTEM_BASE, options.personality),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analise esta refeição e retorne o JSON estruturado.",
            },
            {
              type: "image_url",
              image_url: { url: imageDataUrlOrUrl, detail: "high" },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const elapsed = Date.now() - t0;
    const raw = completion.choices[0]?.message?.content ?? "";
    console.info(
      `[ai:analyze-photo] ok in ${elapsed}ms (provider=${provider.provider}, model=${provider.model}, len=${raw.length})`,
    );

    const parsed = extractJson<Partial<PhotoAnalysisResult>>(raw);
    if (!parsed) {
      console.warn(
        "[ai:analyze-photo] could not parse JSON — preview:",
        raw.slice(0, 200),
      );
      return emptyResult(
        "Não foi possível interpretar a resposta da IA. Adicione os alimentos manualmente.",
      );
    }
    return sanitize(parsed);
  } catch (err) {
    const elapsed = Date.now() - t0;
    console.error(
      `[ai:analyze-photo] request failed after ${elapsed}ms (provider=${provider.provider}, model=${provider.model}): ${describeAIError(err)}`,
    );
    return emptyResult(
      "Falha ao analisar a foto. Tente novamente ou adicione manualmente.",
    );
  }
}
