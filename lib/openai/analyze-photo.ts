import { getOpenAI, OPENAI_VISION_MODEL } from "./client";
import type { AIDetectedFood } from "@/types/database";

export interface PhotoAnalysisResult {
  foods: AIDetectedFood[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  confidence: number;
  summary: string;
}

const SYSTEM_PROMPT = `Você é um nutricionista virtual que analisa fotos de refeições.
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
- Seja conservador nas estimativas; é melhor subestimar que superestimar drasticamente.`;

export async function analyzeMealPhoto(
  imageDataUrlOrUrl: string,
): Promise<PhotoAnalysisResult> {
  const client = getOpenAI();

  const completion = await client.chat.completions.create({
    model: OPENAI_VISION_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: PhotoAnalysisResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI retornou um JSON inválido. Tente novamente.");
  }

  // Sanitize
  parsed.foods = (parsed.foods ?? []).map((f) => ({
    name: String(f.name ?? "Alimento"),
    estimated_quantity: String(f.estimated_quantity ?? ""),
    calories: Number(f.calories ?? 0),
    protein: Number(f.protein ?? 0),
    carbs: Number(f.carbs ?? 0),
    fat: Number(f.fat ?? 0),
  }));
  parsed.total_calories = Number(parsed.total_calories ?? 0);
  parsed.total_protein = Number(parsed.total_protein ?? 0);
  parsed.total_carbs = Number(parsed.total_carbs ?? 0);
  parsed.total_fat = Number(parsed.total_fat ?? 0);
  parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
  parsed.summary = String(parsed.summary ?? "");

  return parsed;
}
