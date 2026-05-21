/**
 * Gemini API client with multi-key failover.
 *
 * Designed for the free tier: rotates between up to 3 API keys,
 * handles rate limits, quota exhaustion, and timeouts gracefully.
 * All requests are server-side only.
 *
 * Reference: https://ai.google.dev/api/generate-content
 */

import type { GeminiConfig } from "./types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiMessage {
  role: "user" | "model";
  parts: GeminiPart[];
}

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiRequest {
  model?: "primary" | "fast";
  systemInstruction?: string;
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

export interface GeminiResponse {
  ok: boolean;
  text: string;
  error?: string;
  keyIndex?: number;
  modelUsed?: string;
}

export interface GeminiHealthResult {
  configured: boolean;
  numKeys: number;
  primaryModel: string;
  fastModel: string;
}

function getConfig(): GeminiConfig {
  const keys: string[] = [];
  const k1 = process.env.GEMINI_API_KEY_1;
  const k2 = process.env.GEMINI_API_KEY_2;
  const k3 = process.env.GEMINI_API_KEY_3;
  if (k1 && k1.length > 10) keys.push(k1);
  if (k2 && k2.length > 10) keys.push(k2);
  if (k3 && k3.length > 10) keys.push(k3);

  return {
    keys,
    primaryModel: process.env.GEMINI_MODEL_PRIMARY ?? "gemini-2.0-flash",
    fastModel: process.env.GEMINI_MODEL_FAST ?? "gemini-2.0-flash",
    timeout: 55_000,
    maxRetries: keys.length,
  };
}

/** Check if any Gemini key is configured */
export function isGeminiConfigured(): boolean {
  return getConfig().keys.length > 0;
}

/** Diagnostic helper: returns config without exposing keys */
export function getGeminiHealth(): GeminiHealthResult {
  const config = getConfig();
  return {
    configured: config.keys.length > 0,
    numKeys: config.keys.length,
    primaryModel: config.primaryModel,
    fastModel: config.fastModel,
  };
}

/** Track which key to try first (rotates on failure) */
let currentKeyIndex = 0;

function isRetryableError(status: number, body: string): boolean {
  if (status === 429 || status === 503 || status === 500 || status === 502) return true;
  if (status === 403 && body.includes("RESOURCE_EXHAUSTED")) return true;
  if (status === 403 && body.includes("QUOTA")) return true;
  if (status === 400 && body.includes("API_KEY_INVALID")) return true;
  return false;
}

/**
 * Execute a Gemini API request with multi-key failover.
 * Tries each configured key in sequence until one succeeds.
 */
export async function callGemini(req: GeminiRequest): Promise<GeminiResponse> {
  const config = getConfig();

  if (config.keys.length === 0) {
    console.error("[gemini] No API keys configured. Set GEMINI_API_KEY_1/2/3.");
    return {
      ok: false,
      text: "",
      error: "No Gemini API keys configured",
    };
  }

  const modelName =
    req.model === "primary" ? config.primaryModel : config.fastModel;

  // Detect multimodal request (has at least one image part)
  const hasImage = req.contents.some((msg) =>
    msg.parts.some((p) => "inlineData" in p),
  );

  // Build request body. Gemini REST API uses camelCase consistently.
  // Reference: https://ai.google.dev/api/generate-content#request-body
  const requestBody: Record<string, unknown> = {
    contents: req.contents,
    generationConfig: {
      temperature: req.generationConfig?.temperature ?? 0.3,
      maxOutputTokens: req.generationConfig?.maxOutputTokens ?? 1200,
    },
  };

  // responseMimeType only works for text-only requests on most models.
  // For multimodal (image) requests, we omit it and rely on prompt
  // engineering to get JSON output.
  if (req.generationConfig?.responseMimeType && !hasImage) {
    (requestBody.generationConfig as Record<string, unknown>).responseMimeType =
      req.generationConfig.responseMimeType;
  }

  // CRITICAL: The REST API expects systemInstruction in camelCase.
  // Snake_case (system_instruction) is for the Python SDK only.
  if (req.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: req.systemInstruction }],
    };
  }

  const startIdx = currentKeyIndex % config.keys.length;
  const keysToTry = config.keys.length;
  const errors: string[] = [];

  console.log(
    `[gemini] Calling ${modelName} (${hasImage ? "multimodal" : "text"}, ${config.keys.length} keys)`,
  );

  for (let attempt = 0; attempt < keysToTry; attempt++) {
    const idx = (startIdx + attempt) % config.keys.length;
    const apiKey = config.keys[idx];
    const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        const errMsg = `[gemini] Key ${idx + 1} failed (${response.status}): ${errBody.slice(0, 300)}`;
        console.error(errMsg);
        errors.push(`key${idx + 1}:${response.status}`);

        if (isRetryableError(response.status, errBody)) {
          continue;
        }
        // Non-retryable error — return immediately so caller sees the actual cause
        return {
          ok: false,
          text: "",
          error: `Gemini ${response.status}: ${errBody.slice(0, 200)}`,
          keyIndex: idx,
          modelUsed: modelName,
        };
      }

      const json = await response.json();

      // Extract text from response — handle multiple parts
      const parts = json?.candidates?.[0]?.content?.parts;
      let text = "";
      if (Array.isArray(parts)) {
        text = parts
          .filter((p: Record<string, unknown>) => typeof p.text === "string")
          .map((p: Record<string, unknown>) => p.text)
          .join("");
      }

      if (!text) {
        const finishReason = json?.candidates?.[0]?.finishReason;
        const safetyRatings = json?.candidates?.[0]?.safetyRatings;
        console.warn(
          `[gemini] Key ${idx + 1} empty response (finishReason: ${finishReason})`,
          safetyRatings ? { safetyRatings } : "",
        );
        errors.push(`key${idx + 1}:empty(${finishReason})`);

        if (finishReason === "SAFETY" || finishReason === "RECITATION") {
          continue;
        }
        // Other empty responses — try next
        continue;
      }

      // Success
      currentKeyIndex = idx;
      console.log(
        `[gemini] Key ${idx + 1} succeeded (${text.length} chars)`,
      );
      return { ok: true, text, keyIndex: idx, modelUsed: modelName };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const errMsg = `[gemini] Key ${idx + 1} ${isTimeout ? "timeout" : "network error"}: ${(err as Error).message}`;
      console.error(errMsg);
      errors.push(`key${idx + 1}:${isTimeout ? "timeout" : "network"}`);
      continue;
    }
  }

  // All keys exhausted — rotate so next call starts at next key
  currentKeyIndex = (currentKeyIndex + 1) % config.keys.length;
  return {
    ok: false,
    text: "",
    error: `All Gemini keys failed: ${errors.join(", ")}`,
    modelUsed: modelName,
  };
}
