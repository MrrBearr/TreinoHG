/**
 * Multi-provider AI chain.
 *
 * For TEXT requests:  Gemini → OpenRouter → LLM7
 * For IMAGE requests: Gemini only (multi-key failover internally).
 *
 * Why? Free-tier vision support on OpenRouter and LLM7 is inconsistent —
 * many free models reject multimodal payloads, and the few that accept
 * them have very low rate limits. Gemini's flash models are stable for
 * vision and our key already has a 3-key rotation. If Gemini's keys are
 * exhausted for vision, falling back to a text-only provider would just
 * waste another quota slot for the same failure mode.
 *
 * Providers without a configured key are skipped silently. The first
 * provider that returns a non-empty success wins.
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

/** Priority order for TEXT requests. */
const TEXT_PROVIDERS: AIProvider[] = [
  geminiProvider,
  openrouterProvider,
  llm7Provider,
];

/**
 * Vision request providers. Currently only Gemini — see file-level note.
 * If you want to enable OpenRouter as a vision fallback, add it here and
 * make sure OPENROUTER_MODEL is a vision-capable model (e.g.
 * `google/gemini-2.0-flash-exp:free`, `meta-llama/llama-3.2-90b-vision-instruct:free`).
 */
const VISION_PROVIDERS: AIProvider[] = [geminiProvider];

/** True when at least one provider is configured. */
export function isAIConfigured(): boolean {
  return TEXT_PROVIDERS.some((p) => p.isConfigured());
}

/** Inspect provider configuration without exposing keys. */
export function getAIHealth(): AIHealthResult {
  const providers: AIProviderHealth[] = TEXT_PROVIDERS.map((p) => {
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
 * Run an AI request through the appropriate provider chain.
 * Returns the first successful response, or an aggregated error.
 */
export async function runAIRequest(req: AIRequest): Promise<AIResponse> {
  const isVision = Boolean(req.image);
  const providers = isVision ? VISION_PROVIDERS : TEXT_PROVIDERS;
  const errors: string[] = [];
  let attempted = 0;

  for (const provider of providers) {
    if (!provider.isConfigured()) {
      continue;
    }
    attempted++;

    console.log(
      `[ai-chain] Trying ${provider.name}${req.task ? ` for ${req.task}` : ""}${isVision ? " (vision)" : ""}`,
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
      error: isVision
        ? "Análise de imagem requer Gemini configurado (GEMINI_API_KEY_*)."
        : "Nenhum provedor de IA configurado. Defina GEMINI_API_KEY_*, OPENROUTER_API_KEY ou LLM7_API_KEY.",
    };
  }

  return {
    ok: false,
    text: "",
    error: `All AI providers failed (${attempted} tried): ${errors.join(" | ")}`,
  };
}
