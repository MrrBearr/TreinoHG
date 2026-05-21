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

export { isGeminiConfigured } from "./gemini-client";
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
  // Brace matching
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
    return { ok: false, foods: [], reason: "failed" };
  }

  const parsed = extractJson<{ foods?: unknown[] }>(res.text);
  if (!parsed || !Array.isArray(parsed.foods)) {
    return { ok: false, foods: [], reason: "failed" };
  }

  const foods = parsed.foods
    .slice(0, 6)
    .map(sanitizeFood)
    .filter((f) => f.name && f.calories > 0);

  return { ok: true, foods };
}

// ─── Photo Analysis ────────────────────────────────────────────

export async function analyzeMealPhoto(
  imageBase64: string,
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
    return emptyResult("IA indisponível. Adicione os alimentos manualmente.");
  }

  // Strip data URL prefix if present
  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  const res = await callGemini({
    model: "primary",
    systemInstruction: PHOTO_ANALYSIS_PROMPT,
    contents: [
      {
        role: "user",
        parts: [
          { text: "Analise esta refeição e retorne o JSON estruturado." },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
    },
  });

  if (!res.ok) {
    return emptyResult("Falha ao analisar. Tente novamente ou adicione manualmente.");
  }

  const parsed = extractJson<Partial<PhotoAnalysisResult>>(res.text);
  if (!parsed) {
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
}

// ─── Text AI (insights, chat, motivation) ──────────────────────

export async function generateInsight(context: string): Promise<AITextResult> {
  if (!isGeminiConfigured()) {
    return { ok: false, content: "", reason: "unavailable" };
  }

  const res = await callGemini({
    model: "fast",
    systemInstruction: INSIGHT_PROMPT,
    contents: [{ role: "user", parts: [{ text: context }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
  });

  if (!res.ok) return { ok: false, content: "", reason: "failed" };
  return { ok: true, content: res.text.trim() };
}

export async function answerCoach(
  question: string,
  context?: string,
): Promise<AITextResult> {
  if (!isGeminiConfigured()) {
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

  if (!res.ok) return { ok: false, content: "", reason: "failed" };
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

  if (!res.ok) return { ok: false, content: "", reason: "failed" };
  return { ok: true, content: res.text.trim().replace(/^["']|["']$/g, "") };
}
