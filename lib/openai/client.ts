import OpenAI from "openai";

/**
 * Centralized AI client.
 *
 * Provider-agnostic: any OpenAI-compatible endpoint (FreeModel.dev, OpenAI,
 * Together, OpenRouter, etc.) can be plugged in by setting OPENAI_BASE_URL.
 *
 * All AI calls happen server-side. Never import this file from a client
 * component.
 */

const DEFAULT_MODEL = "gpt-5.5";
const DEFAULT_BASE_URL = "https://api.freemodel.dev/v1";

/** Single configurable model used for both text and vision requests. */
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

/**
 * Backward-compat alias. Existing code that imports OPENAI_VISION_MODEL keeps
 * working, but it now resolves to the same configurable model.
 */
export const OPENAI_VISION_MODEL =
  process.env.OPENAI_VISION_MODEL ?? OPENAI_MODEL;

export const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL;

/** True when an API key is configured. UI/API routes can check this to fail soft. */
export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let cached: OpenAI | null = null;

/**
 * Returns a singleton OpenAI-compatible client pointed at OPENAI_BASE_URL.
 * Throws AIUnavailableError if no API key is configured so callers can
 * differentiate "not configured" from "provider failed".
 */
export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIUnavailableError(
      "AI provider not configured (missing OPENAI_API_KEY).",
    );
  }
  cached = new OpenAI({
    apiKey,
    baseURL: OPENAI_BASE_URL,
    // Generous timeout so a slow upstream doesn't hang serverless functions.
    timeout: 45_000,
    // Retry transient 5xx / network blips automatically. The client only
    // retries idempotent / safe-to-retry failures; this isn't a substitute
    // for surfacing real errors back to the caller.
    maxRetries: 2,
  });
  return cached;
}

/**
 * Diagnostic snapshot of the active provider. Logged at the start of every
 * AI call so when something goes wrong we can see *which* provider/model
 * was actually addressed (vs. falling back to defaults silently).
 */
export function aiProviderInfo(): {
  baseUrl: string;
  model: string;
  hasKey: boolean;
} {
  return {
    baseUrl: OPENAI_BASE_URL,
    model: OPENAI_MODEL,
    hasKey: Boolean(process.env.OPENAI_API_KEY),
  };
}

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

/** Thrown when the AI provider is not configured or is unreachable. */
export class AIUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIUnavailableError";
  }
}

/**
 * Raised by higher-level AI helpers when the entire pipeline (provider +
 * fallback paths) failed to produce a usable result. Routes can catch this
 * and surface a clean 503 to the client instead of falling back to a misleading
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

/**
 * Best-effort JSON extractor. AI providers occasionally wrap JSON in fences
 * or prepend explanations; this finds the first balanced JSON object.
 * Returns null when nothing parseable is found.
 */
export function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  // Direct parse first.
  try {
    return JSON.parse(raw) as T;
  } catch {
    // continue
  }
  // Strip common code fences.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as T;
    } catch {
      // continue
    }
  }
  // Fallback: find the first { ... } block by brace matching.
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
