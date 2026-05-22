import OpenAI from "openai";

/**
 * Centralized AI provider layer.
 *
 * The app uses three distinct provider channels, each with its own env vars:
 *
 *   1. VISION  — NVIDIA NIM (OpenAI-compatible) for meal-photo analysis.
 *      Required: NVIDIA_API_KEY
 *      Optional: NVIDIA_BASE_URL (defaults to integrate.api.nvidia.com)
 *                NVIDIA_VISION_MODEL (defaults to a Llama 3.2 vision model)
 *
 *   2. TEXT    — LLM7 (preferred) or TEXT_AI (fallback) for typed food
 *                parsing, daily insights, coach answers, motivational lines.
 *      Required for LLM7:    LLM7_API_KEY + LLM7_MODEL
 *      Required for TEXT_AI: TEXT_AI_API_KEY + TEXT_AI_BASE_URL + TEXT_AI_MODEL
 *      The two are tried in order; the first one fully configured wins.
 *
 *   3. NUTRITION — TACO/TBCA (built-in) + USDA (USDA_API_KEY) — handled
 *      separately in lib/nutrition; not part of this file.
 *
 * Both VISION and TEXT speak the OpenAI chat-completions wire format, so we
 * use the `openai` SDK pointed at each provider's base URL with that
 * provider's key. Nothing here depends on OpenAI itself.
 */

// =====================================================================
// Provider defaults — override via env vars listed in .env.example
// =====================================================================

const NVIDIA_BASE_URL_DEFAULT = "https://integrate.api.nvidia.com/v1";
const NVIDIA_VISION_MODEL_DEFAULT = "meta/llama-3.2-90b-vision-instruct";
const LLM7_BASE_URL = "https://api.llm7.io/v1";

const REQUEST_TIMEOUT_MS = 45_000;
const REQUEST_MAX_RETRIES = 2;

// =====================================================================
// Errors
// =====================================================================

/** Thrown when a provider isn't configured at all (no key / no model). */
export class AIUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIUnavailableError";
  }
}

/**
 * Raised by higher-level AI helpers when the entire pipeline (provider +
 * fallback paths) failed to produce a usable result. Routes catch this and
 * surface a clean 503 to the client instead of falling back to a misleading
 * "empty success" response.
 */
export class AIPipelineError extends Error {
  constructor(
    public reason: "unavailable" | "failed",
    message: string,
  ) {
    super(message);
    this.name = "AIPipelineError";
  }
}

// =====================================================================
// Client handles
// =====================================================================

export type AIChannelKind = "text" | "vision";
export type AIProviderName = "llm7" | "text_ai" | "nvidia";

export interface AIClientHandle {
  client: OpenAI;
  model: string;
  baseUrl: string;
  provider: AIProviderName;
}

let cachedText: AIClientHandle | null = null;
let cachedVision: AIClientHandle | null = null;

function buildClient(opts: { apiKey: string; baseUrl: string }): OpenAI {
  return new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseUrl,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: REQUEST_MAX_RETRIES,
  });
}

/**
 * Pick the active text provider. LLM7 is preferred when both
 * LLM7_API_KEY and LLM7_MODEL are set; otherwise TEXT_AI is used when
 * TEXT_AI_API_KEY + TEXT_AI_BASE_URL + TEXT_AI_MODEL are all present.
 *
 * Throws AIUnavailableError when neither is fully configured.
 */
export function getTextClient(): AIClientHandle {
  if (cachedText) return cachedText;

  const llm7Key = process.env.LLM7_API_KEY;
  const llm7Model = process.env.LLM7_MODEL;
  if (llm7Key && llm7Model) {
    cachedText = {
      client: buildClient({ apiKey: llm7Key, baseUrl: LLM7_BASE_URL }),
      model: llm7Model,
      baseUrl: LLM7_BASE_URL,
      provider: "llm7",
    };
    return cachedText;
  }

  const textKey = process.env.TEXT_AI_API_KEY;
  const textBase = process.env.TEXT_AI_BASE_URL;
  const textModel = process.env.TEXT_AI_MODEL;
  if (textKey && textBase && textModel) {
    cachedText = {
      client: buildClient({ apiKey: textKey, baseUrl: textBase }),
      model: textModel,
      baseUrl: textBase,
      provider: "text_ai",
    };
    return cachedText;
  }

  throw new AIUnavailableError(
    "Text AI not configured. Set LLM7_API_KEY+LLM7_MODEL, or TEXT_AI_API_KEY+TEXT_AI_BASE_URL+TEXT_AI_MODEL.",
  );
}

/**
 * NVIDIA NIM client for vision tasks. Uses the OpenAI-compatible chat
 * completions endpoint at integrate.api.nvidia.com.
 *
 * Throws AIUnavailableError when NVIDIA_API_KEY is missing.
 */
export function getVisionClient(): AIClientHandle {
  if (cachedVision) return cachedVision;

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new AIUnavailableError(
      "Vision AI not configured (missing NVIDIA_API_KEY).",
    );
  }
  const baseUrl = process.env.NVIDIA_BASE_URL ?? NVIDIA_BASE_URL_DEFAULT;
  const model =
    process.env.NVIDIA_VISION_MODEL ?? NVIDIA_VISION_MODEL_DEFAULT;
  cachedVision = {
    client: buildClient({ apiKey, baseUrl }),
    model,
    baseUrl,
    provider: "nvidia",
  };
  return cachedVision;
}

// =====================================================================
// Configuration probes (used by route handlers)
// =====================================================================

export function isTextAIConfigured(): boolean {
  if (process.env.LLM7_API_KEY && process.env.LLM7_MODEL) return true;
  if (
    process.env.TEXT_AI_API_KEY &&
    process.env.TEXT_AI_BASE_URL &&
    process.env.TEXT_AI_MODEL
  ) {
    return true;
  }
  return false;
}

export function isVisionAIConfigured(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY);
}

/** True when at least one AI surface (text OR vision) is reachable. */
export function isAIConfigured(): boolean {
  return isTextAIConfigured() || isVisionAIConfigured();
}

// =====================================================================
// Diagnostic snapshot used by every AI helper for log lines
// =====================================================================

export interface AIProviderSnapshot {
  baseUrl: string;
  model: string;
  provider: AIProviderName | "none";
  hasKey: boolean;
}

export function aiProviderInfo(kind: AIChannelKind): AIProviderSnapshot {
  try {
    const handle = kind === "text" ? getTextClient() : getVisionClient();
    return {
      baseUrl: handle.baseUrl,
      model: handle.model,
      provider: handle.provider,
      hasKey: true,
    };
  } catch {
    return {
      baseUrl: "",
      model: "",
      provider: "none",
      hasKey: false,
    };
  }
}

// =====================================================================
// Error formatting + JSON extraction (used by every AI helper)
// =====================================================================

/**
 * Best-effort error message for any thrown value coming out of the OpenAI
 * SDK. The SDK exposes `.status`, `.code`, `.type`, `.error.message` on its
 * APIError class, but plain Errors and AbortErrors also pass through here.
 */
export function describeAIError(err: unknown): string {
  if (!err) return "unknown error";
  const e = err as {
    status?: number;
    code?: string;
    name?: string;
    message?: string;
    error?: { message?: string };
  };
  const parts: string[] = [];
  if (e.name) parts.push(e.name);
  if (typeof e.status === "number") parts.push(`HTTP ${e.status}`);
  if (e.code) parts.push(e.code);
  const msg = e.error?.message ?? e.message ?? "";
  if (msg) parts.push(msg);
  return parts.join(" — ") || String(err);
}

/**
 * Best-effort JSON extractor. AI providers occasionally wrap JSON in fences
 * or prepend explanations; this finds the first balanced JSON object.
 * Returns null when nothing parseable is found.
 */
export function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // continue
  }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as T;
    } catch {
      // continue
    }
  }
  const start = raw.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = raw.slice(start, i + 1);
        try {
          return JSON.parse(slice) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
