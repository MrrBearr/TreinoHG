/**
 * Two-provider AI chain with task-aware routing.
 *
 *   VISION (image)  → NVIDIA primary, TEXT_AI fallback
 *   TEXT            → TEXT_AI primary, NVIDIA fallback
 *
 * Free-tier aware: providers without a configured key are skipped
 * silently. The first provider that returns non-empty success wins.
 */

import { nvidiaProvider } from "./nvidia";
import { textAIProvider } from "./text-ai";
import type {
  AIHealthResult,
  AIProvider,
  AIProviderHealth,
  AIRequest,
  AIResponse,
} from "../types";

const VISION_CHAIN: AIProvider[] = [nvidiaProvider, textAIProvider];
const TEXT_CHAIN: AIProvider[] = [textAIProvider, nvidiaProvider];

/** True when at least one provider is configured. */
export function isAIConfigured(): boolean {
  return [nvidiaProvider, textAIProvider].some((p) => p.isConfigured());
}

/** Inspect provider configuration without exposing keys. */
export function getAIHealth(): AIHealthResult {
  const providers: AIProviderHealth[] = [
    {
      name: "nvidia",
      configured: nvidiaProvider.isConfigured(),
      model: process.env.NVIDIA_MODEL || "meta/llama-3.2-90b-vision-instruct",
      baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    },
    {
      name: "text_ai",
      configured: textAIProvider.isConfigured(),
      model: process.env.TEXT_AI_MODEL || "llama-3.3-70b-versatile",
      baseUrl: process.env.TEXT_AI_BASE_URL || "https://api.groq.com/openai/v1",
    },
  ];

  return {
    configured: providers.some((p) => p.configured),
    providers,
  };
}

/**
 * Run an AI request through the appropriate chain.
 * Returns the first successful response, or an aggregated error.
 */
export async function runAIRequest(req: AIRequest): Promise<AIResponse> {
  const isVision = Boolean(req.image);
  const chain = isVision ? VISION_CHAIN : TEXT_CHAIN;
  const errors: string[] = [];
  let attempted = 0;

  for (const provider of chain) {
    if (!provider.isConfigured()) continue;
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
        `[ai-chain] ✓ ${provider.name} ok (model=${res.modelUsed}, ${res.text.length} chars)`,
      );
      return res;
    }

    console.warn(
      `[ai-chain] ✗ ${provider.name} failed: ${res.error ?? "(no error)"}`,
    );
    errors.push(`${provider.name}:${res.error ?? "failed"}`);
  }

  if (attempted === 0) {
    return {
      ok: false,
      text: "",
      error: isVision
        ? "Análise de imagem requer NVIDIA_API_KEY ou TEXT_AI_API_KEY configurado."
        : "Nenhum provedor de IA configurado. Defina TEXT_AI_API_KEY ou NVIDIA_API_KEY.",
    };
  }

  return {
    ok: false,
    text: "",
    error: `All AI providers failed (${attempted} tried): ${errors.join(" | ")}`,
  };
}
