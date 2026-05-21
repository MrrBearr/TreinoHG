/**
 * Central AI module for TreinoHG.
 *
 * Routes every AI call through the dual-provider chain:
 *   TEXT tasks  → TEXT_AI primary, NVIDIA fallback
 *   VISION tasks → NVIDIA primary, TEXT_AI fallback
 *
 * Every exported function returns a safe result — never throws.
 */

import { runAIRequest } from "./providers/chain";
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

// ─── Re-exports ────────────────────────────────────────────────

export { isAIConfigured, getAIHealth, runAIRequest } from "./providers/chain";

export type {
  AIEstimateResult,
  AITextResult,
  EstimatedFood,
  PhotoAnalysisResult,
  AIHealthResult,
  AIProviderName,
} from "./types";

// ─── JSON parsing helpers ──────────────────────────────────────

function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { /* continue */ }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) { try { return JSON.parse(fenced[1]) as T; } catch { /* continue */ } }
  const start = raw.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") {
      depth--;
      if (depth === 0) { try { return JSON.parse(raw.slice(start, i + 1)) as T; } catch { return null; } }
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

// ─── In-memory cache for text estimation (prevents quota spam) ─

const _cache = new Map<string, { foods: EstimatedFood[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): EstimatedFood[] | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.foods;
}

function setCache(key: string, foods: EstimatedFood[]) {
  _cache.set(key, { foods, ts: Date.now() });
  // Keep cache bounded
  if (_cache.size > 200) {
    const first = _cache.keys().next().value;
    if (first) _cache.delete(first);
  }
}

// ─── isGeminiConfigured backward compat (used by health route) ─

export function isGeminiConfigured(): boolean {
  // Kept for backward compat with existing health route imports
  const { isAIConfigured } = require("./providers/chain");
  return isAIConfigured();
}

export function getGeminiHealth() {
  const { getAIHealth } = require("./providers/chain");
  return getAIHealth();
}

export function callGemini() {
  // No-op stub for backward compat — the health route now uses runAIRequest
  return Promise.resolve({ ok: false, text: "", error: "deprecated" });
}

// ─── Food Estimation (text) ────────────────────────────────────

export async function estimateFoods(query: string): Promise<AIEstimateResult> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return { ok: true, foods: [] };

  // Check cache
  const cached = getCached(trimmed.toLowerCase());
  if (cached) {
    console.log(`[ai:estimateFoods] Cache hit for "${trimmed}"`);
    return { ok: true, foods: cached };
  }

  const { isAIConfigured } = await import("./providers/chain");
  if (!isAIConfigured()) {
    console.error("[ai:estimateFoods] No providers configured");
    return { ok: false, foods: [], reason: "unavailable" };
  }

  const res = await runAIRequest({
    systemInstruction: ESTIMATE_FOOD_PROMPT,
    userText: trimmed,
    temperature: 0.2,
    maxOutputTokens: 800,
    jsonMode: true,
    task: "estimate_food",
  });

  if (!res.ok) {
    console.error("[ai:estimateFoods] Chain failed:", res.error);
    return { ok: false, foods: [], reason: "failed" };
  }

  const parsed = extractJson<{ foods?: unknown[] }>(res.text);
  if (!parsed || !Array.isArray(parsed.foods)) {
    console.error("[ai:estimateFoods] Failed to parse JSON:", res.text.slice(0, 200));
    return { ok: false, foods: [], reason: "failed" };
  }

  const foods = parsed.foods.slice(0, 8).map(sanitizeFood).filter((f) => f.name && f.calories > 0);

  // Cache the result
  setCache(trimmed.toLowerCase(), foods);

  console.log(`[ai:estimateFoods] Returned ${foods.length} food(s) for "${trimmed}" via ${res.providerUsed}`);
  return { ok: true, foods, providerUsed: res.providerUsed };
}

// ─── Photo Analysis ────────────────────────────────────────────

export async function analyzeMealPhoto(
  imageInput: string,
  mimeType: string = "image/jpeg",
): Promise<PhotoAnalysisResult> {
  const emptyResult = (summary: string): PhotoAnalysisResult => ({
    foods: [], total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0,
    confidence: 0, summary, fallback: true,
  });

  const { isAIConfigured } = await import("./providers/chain");
  if (!isAIConfigured()) {
    return emptyResult("IA indisponível. Adicione os alimentos manualmente.");
  }

  // Extract base64 data
  let base64Data: string;
  if (imageInput.startsWith("data:")) {
    const commaIdx = imageInput.indexOf(",");
    if (commaIdx === -1) return emptyResult("Formato de imagem inválido.");
    base64Data = imageInput.slice(commaIdx + 1);
    const mimeMatch = imageInput.match(/^data:(image\/[^;]+);/);
    if (mimeMatch) mimeType = mimeMatch[1];
  } else if (imageInput.startsWith("http")) {
    try {
      const response = await fetch(imageInput);
      if (!response.ok) return emptyResult("Não foi possível baixar a imagem.");
      const arrayBuffer = await response.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
      const ct = response.headers.get("content-type");
      if (ct?.startsWith("image/")) mimeType = ct;
    } catch (err) {
      console.error("[ai:analyzeMealPhoto] Fetch failed:", err);
      return emptyResult("Falha ao acessar a imagem.");
    }
  } else {
    base64Data = imageInput;
  }

  if (!base64Data || base64Data.length < 100) return emptyResult("Imagem inválida.");
  base64Data = base64Data.replace(/\s/g, "");

  console.log(`[ai:analyzeMealPhoto] Sending: mime=${mimeType}, len=${base64Data.length}`);

  try {
    const res = await runAIRequest({
      systemInstruction: PHOTO_ANALYSIS_PROMPT,
      userText: "Analise esta refeição na foto e retorne o JSON estruturado com os alimentos, calorias e macros.",
      image: { mimeType, base64: base64Data },
      temperature: 0.2,
      maxOutputTokens: 1500,
      task: "analyze_photo",
    });

    if (!res.ok) {
      console.error("[ai:analyzeMealPhoto] Chain failed:", res.error);
      return emptyResult(`Falha ao analisar. ${res.error ?? "Tente novamente."}`);
    }

    console.log("[ai:analyzeMealPhoto] Response:", res.text.slice(0, 300));

    const parsed = extractJson<Partial<PhotoAnalysisResult>>(res.text);
    if (!parsed) {
      console.error("[ai:analyzeMealPhoto] JSON parse failed:", res.text.slice(0, 500));
      return emptyResult("Não foi possível interpretar a resposta da IA.");
    }

    const foods = Array.isArray(parsed.foods) ? parsed.foods.map(sanitizeFood).filter((f) => f.name) : [];

    return {
      foods,
      total_calories: safeNum(parsed.total_calories),
      total_protein: safeNum(parsed.total_protein),
      total_carbs: safeNum(parsed.total_carbs),
      total_fat: safeNum(parsed.total_fat),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      summary: String(parsed.summary ?? ""),
      fallback: false,
      providerUsed: res.providerUsed,
    };
  } catch (err) {
    console.error("[ai:analyzeMealPhoto] Unexpected:", err);
    return emptyResult("Erro inesperado ao analisar a foto.");
  }
}

// ─── Text AI (insights, chat, motivation) ──────────────────────

export async function generateInsight(context: string): Promise<AITextResult> {
  const { isAIConfigured } = await import("./providers/chain");
  if (!isAIConfigured()) return { ok: false, content: "", reason: "unavailable" };

  const res = await runAIRequest({
    systemInstruction: INSIGHT_PROMPT,
    userText: context,
    temperature: 0.7,
    maxOutputTokens: 200,
    task: "insight",
  });

  if (!res.ok) return { ok: false, content: "", reason: "failed" };
  return { ok: true, content: res.text.trim(), providerUsed: res.providerUsed };
}

export async function answerCoach(question: string, context?: string): Promise<AITextResult> {
  const { isAIConfigured } = await import("./providers/chain");
  if (!isAIConfigured()) return { ok: false, content: "", reason: "unavailable" };

  const systemPrompt = context ? `${CHAT_PROMPT}\n\nContexto do usuário:\n${context}` : CHAT_PROMPT;

  const res = await runAIRequest({
    systemInstruction: systemPrompt,
    userText: question,
    temperature: 0.7,
    maxOutputTokens: 300,
    task: "chat",
  });

  if (!res.ok) return { ok: false, content: "", reason: "failed" };
  return { ok: true, content: res.text.trim(), providerUsed: res.providerUsed };
}

export async function generateMotivation(goal?: string): Promise<AITextResult> {
  const { isAIConfigured } = await import("./providers/chain");
  if (!isAIConfigured()) return { ok: false, content: "", reason: "unavailable" };

  const res = await runAIRequest({
    systemInstruction: MOTIVATION_PROMPT,
    userText: `Objetivo: ${goal ?? "performance"}. Gere a frase.`,
    temperature: 0.9,
    maxOutputTokens: 60,
    task: "motivation",
  });

  if (!res.ok) return { ok: false, content: "", reason: "failed" };
  return { ok: true, content: res.text.trim().replace(/^["']|["']$/g, ""), providerUsed: res.providerUsed };
}
