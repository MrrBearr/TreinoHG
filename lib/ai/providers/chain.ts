/**
 * Multi-provider AI chain.
 *
 * Tries providers in priority order: Gemini → OpenRouter → LLM7.
 * The first provider that returns a non-empty successful response wins.
 * If all configured providers fail, returns a graceful AIResponse with
 * ok=false and an aggregated error message.
 *
 * Providers that aren't configured (no API key) are skipped silently.
 */

import { geminiProvider } from "./gemini";
import { openrouterProvider } from "./openrouter";
import { llm7Provider } from "./llm7";
import type {
  AIHealthResult,
  AIProvider,
  AIProviderHealth,
  AIRequest,
  AIResponse,
} from "../types";

/** Priority order — Gemini first, then OpenRouter, then LLM7. */
const PROVIDERS: AIProvider[] = [
  geminiProvider,
  openrouterProvider,
  llm7Provider,
];

/** True when at least one provider is configured. */
export function isAIConfigured(): boolean {
  return PROVIDERS.some((p) => p.isConfigured());
}

/** Inspect provider configuration without exposing keys. */
export function getAIHealth(): AIHealthResult {
  const providers: AIProviderHealth[] = PROVIDERS.map((p) => {
    if (p.name === "gemini") {
      const numKeys = [
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
      ].filter((k): k is string => Boolean(k && k.length > 10)).length;
      return {
        name: "gemini",
        configured: numKeys > 0,
        numKeys,
        model: process.env.GEMINI_MODEL_PRIMARY ?? "gemini-2.0-flash",
      };
    }
    if (p.name === "openrouter") {
      return {
        name: "openrouter",
        configured: p.isConfigured(),
        model:
          process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-exp:free",
      };
    }
    return {
      name: "llm7",
      configured: p.isConfigured(),
      model: process.env.LLM7_MODEL ?? "gpt-4o-mini",
    };
  });

  return {
    configured: providers.some((p) => p.configured),
    providers,
  };
}

/**
 * Run an AI request through the provider chain.
 * Returns the first successful response, or an aggregated error.
 */
export async function runAIRequest(req: AIRequest): Promise<AIResponse> {
  const errors: string[] = [];
  let attempted = 0;

  for (const provider of PROVIDERS) {
    if (!provider.isConfigured()) {
      continue;
    }
    attempted++;

    console.log(
      `[ai-chain] Trying ${provider.name}${req.task ? ` for ${req.task}` : ""}${req.image ? " (multimodal)" : ""}`,
    );

    let res: AIResponse;
    try {
      res = await provider.call(req);
    } catch (err) {
      const msg = (err as Error)?.message ?? "unknown error";
      console.error(`[ai-chain] ${provider.name} threw:`, msg);
      errors.push(`${provider.name}:throw(${msg})`);
      continue;
    }

    if (res.ok && res.text) {
      console.log(
        `[ai-chain] ✓ ${provider.name} succeeded (model=${res.modelUsed}, ${res.text.length} chars)`,
      );
      return res;
    }

    console.warn(
      `[ai-chain] ✗ ${provider.name} failed: ${res.error ?? "(no error message)"}`,
    );
    errors.push(`${provider.name}:${res.error ?? "failed"}`);
  }

  if (attempted === 0) {
    return {
      ok: false,
      text: "",
      error:
        "No AI providers configured. Set GEMINI_API_KEY_*, OPENROUTER_API_KEY, or LLM7_API_KEY.",
    };
  }

  return {
    ok: false,
    text: "",
    error: `All AI providers failed (${attempted} tried): ${errors.join(" | ")}`,
  };
}
