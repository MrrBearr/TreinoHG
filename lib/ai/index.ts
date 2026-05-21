/**
 * Central AI module for TreinoHG.
 *
 * All AI functionality goes through here. Uses Gemini with multi-key
 * failover. Every function returns a safe result — never throws.
 */

import { callGemini, isGeminiConfigured } from "./gemini-client";
import type {
  AIEstimateResult,
  AITextResult,
  EstimatedFood,
  PhotoAnalysisResult,
} from "./types";
import {
  CHAT_PROMPT,
  ESTIMATE_FOOD_PROMPT,
  INSIGHT_PROMPT,
  MOTIVATION_PROMPT,
  PHOTO_ANALYSIS_PROMPT,
} from "./prompts";

export { isGeminiConfigured, getGeminiHealth, callGemini } from "./gemini-client";
export type {
  AIEstimateResult,
  AITextResult,
  EstimatedFood,
  PhotoAnalysisResult,
} from "./types";

// ─── JSON Parsing ──────────────────────────────────────────────

function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  // Direct parse
  try {
    return JSON.parse(raw) as T;
  } catch {
    /* continue */
  }
  // Code fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as T;
    } catch {
      /* continue */
    }
  }
  // Brace matching — find the outermost { ... }
  const start = raw.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function sanitizeFood(f: unknown): EstimatedFood {
  const obj = (f ?? {}) as Record<string, unknown>;
  return {
    name: String(obj.name ?? "").slice(0, 120).trim() || "Alimento",
    quantity: String(obj.quantity ?? obj.estimated_quantity ?? "").slice(0, 80),
    calories: safeNum(obj.calories),
    protein_g: safeNum(obj.protein_g ?? obj.protein),
    carbs_g: safeNum(obj.carbs_g ?? obj.carbs),
    fat_g: safeNum(obj.fat_g ?? obj.fat),
  };
}

// ─── Food Estimation (text) ────────────────────────────────────

export async function estimateFoods(
  query: string,
): Promise<AIEstimateResult> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return { ok: true, foods: [] };
  }
  if (!isGeminiConfigured()) {
    console.error("[ai:estimateFoods] Gemini not configured");
    return { ok: false, foods: [], reason: "unavailable" };
  }

  const res = await callGemini({
    model: "fast",
    systemInstruction: ESTIMATE_FOOD_PROMPT,
    contents: [{ role: "user", parts: [{ text: trimmed }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800,
      responseMimeType: "application/json",
    },
  });

  if (!res.ok) {
    console.error("[ai:estimateFoods] Gemini failed:", res.error);
    return { ok: false, foods: [], reason: "failed" };
  }

  const parsed = extractJson<{ foods?: unknown[] }>(res.text);
  if (!parsed || !Array.isArray(parsed.foods)) {
    console.error(
      "[ai:estimateFoods] Failed to parse JSON from:",
      res.text.slice(0, 200),
    );
    return { ok: false, foods: [], reason: "failed" };
  }

  const foods = parsed.foods
    .slice(0, 6)
    .map(sanitizeFood)
    .filter((f) => f.name && f.calories > 0);

  console.log(`[ai:estimateFoods] Returned ${foods.length} food(s) for "${trimmed}"`);
  return { ok: true, foods };
}

// ─── Photo Analysis ────────────────────────────────────────────

/**
 * Analyze a meal photo. Accepts either:
 *  - A full data URL: "data:image/jpeg;base64,/9j/4AAQ..."
 *  - Raw base64 string (no prefix)
 *  - HTTP(S) URL (will be fetched + converted)
 */
export async function analyzeMealPhoto(
  imageInput: string,
  mimeType: string = "image/jpeg",
): Promise<PhotoAnalysisResult> {
  const emptyResult = (summary: string): PhotoAnalysisResult => ({
    foods: [],
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    confidence: 0,
    summary,
    fallback: true,
  });

  if (!isGeminiConfigured()) {
    console.error("[ai:analyzeMealPhoto] Gemini not configured");
    return emptyResult("IA indisponível. Adicione os alimentos manualmente.");
  }

  // Extract pure base64 data
  let base64Data: string;
  if (imageInput.startsWith("data:")) {
    const commaIdx = imageInput.indexOf(",");
    if (commaIdx === -1) {
      console.error("[ai:analyzeMealPhoto] Malformed data URL");
      return emptyResult("Formato de imagem inválido.");
    }
    base64Data = imageInput.slice(commaIdx + 1);

    const mimeMatch = imageInput.match(/^data:(image\/[^;]+);/);
    if (mimeMatch) mimeType = mimeMatch[1];
  } else if (imageInput.startsWith("http")) {
    try {
      const response = await fetch(imageInput);
      if (!response.ok) {
        console.error(
          `[ai:analyzeMealPhoto] Failed to fetch URL: ${response.status}`,
        );
        return emptyResult("Não foi possível baixar a imagem.");
      }
      const arrayBuffer = await response.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
      const contentType = response.headers.get("content-type");
      if (contentType?.startsWith("image/")) mimeType = contentType;
    } catch (err) {
      console.error("[ai:analyzeMealPhoto] Failed to fetch image URL:", err);
      return emptyResult("Falha ao acessar a imagem.");
    }
  } else {
    base64Data = imageInput;
  }

  if (!base64Data || base64Data.length < 100) {
    console.error("[ai:analyzeMealPhoto] Image data too small:", base64Data.length);
    return emptyResult("Imagem muito pequena ou inválida.");
  }

  // Strip whitespace from base64
  base64Data = base64Data.replace(/\s/g, "");

  console.log(
    `[ai:analyzeMealPhoto] Sending image: mime=${mimeType}, base64Length=${base64Data.length}`,
  );

  try {
    const res = await callGemini({
      model: "primary",
      systemInstruction: PHOTO_ANALYSIS_PROMPT,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Analise esta refeição na foto e retorne o JSON estruturado com os alimentos, calorias e macros.",
            },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
    });

    if (!res.ok) {
      console.error("[ai:analyzeMealPhoto] Gemini call failed:", res.error);
      return emptyResult(
        `Falha ao analisar a foto. ${res.error ?? "Tente novamente."}`,
      );
    }

    console.log(
      "[ai:analyzeMealPhoto] Raw response (first 300 chars):",
      res.text.slice(0, 300),
    );

    const parsed = extractJson<Partial<PhotoAnalysisResult>>(res.text);
    if (!parsed) {
      console.error(
        "[ai:analyzeMealPhoto] Failed to extract JSON from response:",
        res.text.slice(0, 500),
      );
      return emptyResult("Não foi possível interpretar a resposta da IA.");
    }

    const foods = Array.isArray(parsed.foods)
      ? parsed.foods.map(sanitizeFood).filter((f) => f.name)
      : [];

    return {
      foods,
      total_calories: safeNum(parsed.total_calories),
      total_protein: safeNum(parsed.total_protein),
      total_carbs: safeNum(parsed.total_carbs),
      total_fat: safeNum(parsed.total_fat),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      summary: String(parsed.summary ?? ""),
      fallback: false,
    };
  } catch (err) {
    console.error("[ai:analyzeMealPhoto] Unexpected error:", err);
    return emptyResult("Erro inesperado ao analisar a foto.");
  }
}

// ─── Text AI (insights, chat, motivation) ──────────────────────

export async function generateInsight(context: string): Promise<AITextResult> {
  if (!isGeminiConfigured()) {
    console.error("[ai:generateInsight] Gemini not configured");
    return { ok: false, content: "", reason: "unavailable" };
  }

  const res = await callGemini({
    model: "fast",
    systemInstruction: INSIGHT_PROMPT,
    contents: [{ role: "user", parts: [{ text: context }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
  });

  if (!res.ok) {
    console.error("[ai:generateInsight] Gemini failed:", res.error);
    return { ok: false, content: "", reason: "failed" };
  }
  return { ok: true, content: res.text.trim() };
}

export async function answerCoach(
  question: string,
  context?: string,
): Promise<AITextResult> {
  if (!isGeminiConfigured()) {
    console.error("[ai:answerCoach] Gemini not configured");
    return { ok: false, content: "", reason: "unavailable" };
  }

  const systemPrompt = context
    ? `${CHAT_PROMPT}\n\nContexto do usuário:\n${context}`
    : CHAT_PROMPT;

  const res = await callGemini({
    model: "fast",
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: question }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
  });

  if (!res.ok) {
    console.error("[ai:answerCoach] Gemini failed:", res.error);
    return { ok: false, content: "", reason: "failed" };
  }
  return { ok: true, content: res.text.trim() };
}

export async function generateMotivation(goal?: string): Promise<AITextResult> {
  if (!isGeminiConfigured()) {
    return { ok: false, content: "", reason: "unavailable" };
  }

  const res = await callGemini({
    model: "fast",
    systemInstruction: MOTIVATION_PROMPT,
    contents: [
      {
        role: "user",
        parts: [{ text: `Objetivo: ${goal ?? "performance"}. Gere a frase.` }],
      },
    ],
    generationConfig: { temperature: 0.9, maxOutputTokens: 60 },
  });

  if (!res.ok) {
    console.error("[ai:generateMotivation] Gemini failed:", res.error);
    return { ok: false, content: "", reason: "failed" };
  }
  return { ok: true, content: res.text.trim().replace(/^["']|["']$/g, "") };
}
