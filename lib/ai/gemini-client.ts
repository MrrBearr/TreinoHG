/**
 * Gemini API client with multi-key failover.
 *
 * Designed for the free tier: rotates between up to 3 API keys,
 * handles rate limits, quota exhaustion, and timeouts gracefully.
 * All requests are server-side only.
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
}

function getConfig(): GeminiConfig {
  const keys: string[] = [];
  const k1 = process.env.GEMINI_API_KEY_1;
  const k2 = process.env.GEMINI_API_KEY_2;
  const k3 = process.env.GEMINI_API_KEY_3;
  if (k1) keys.push(k1);
  if (k2) keys.push(k2);
  if (k3) keys.push(k3);

  return {
    keys,
    primaryModel: process.env.GEMINI_MODEL_PRIMARY ?? "gemini-2.5-flash",
    fastModel: process.env.GEMINI_MODEL_FAST ?? "gemini-2.5-flash",
    timeout: 40_000,
    maxRetries: keys.length,
  };
}

/** Check if any Gemini key is configured */
export function isGeminiConfigured(): boolean {
  return getConfig().keys.length > 0;
}

/** Track which key to try first (rotates on failure) */
let currentKeyIndex = 0;

function isRetryableError(status: number, body: string): boolean {
  // Rate limit, quota, server errors, auth issues (key exhausted)
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
    return { ok: false, text: "", error: "No Gemini API keys configured" };
  }

  const modelName =
    req.model === "primary" ? config.primaryModel : config.fastModel;

  const body: Record<string, unknown> = {
    contents: req.contents,
    generationConfig: {
      temperature: req.generationConfig?.temperature ?? 0.3,
      maxOutputTokens: req.generationConfig?.maxOutputTokens ?? 1200,
      ...(req.generationConfig?.responseMimeType
        ? { responseMimeType: req.generationConfig.responseMimeType }
        : {}),
    },
  };

  if (req.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: req.systemInstruction }],
    };
  }

  const startIdx = currentKeyIndex % config.keys.length;
  const keysToTry = config.keys.length;

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
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        if (isRetryableError(response.status, errBody)) {
          console.warn(
            `[gemini] Key ${idx + 1} failed (${response.status}), trying next...`,
          );
          continue;
        }
        // Non-retryable error
        return {
          ok: false,
          text: "",
          error: `Gemini error ${response.status}: ${errBody.slice(0, 200)}`,
          keyIndex: idx,
        };
      }

      const json = await response.json();
      const text =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!text) {
        // Empty response — might be content filtering; try next key
        console.warn(`[gemini] Key ${idx + 1} returned empty response`);
        continue;
      }

      // Success — rotate to this key for next time
      currentKeyIndex = idx;
      return { ok: true, text, keyIndex: idx };
    } catch (err) {
      const isTimeout =
        err instanceof Error && err.name === "AbortError";
      console.warn(
        `[gemini] Key ${idx + 1} ${isTimeout ? "timeout" : "network error"}:`,
        (err as Error).message,
      );
      // Try next key
      continue;
    }
  }

  // All keys exhausted
  currentKeyIndex = (currentKeyIndex + 1) % config.keys.length;
  return {
    ok: false,
    text: "",
    error: "All Gemini API keys exhausted or failed",
  };
}
