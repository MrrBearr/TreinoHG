/**
 * OpenRouter provider — secondary fallback in the chain.
 *
 * https://openrouter.ai/docs — OpenAI-compatible Chat Completions endpoint.
 * Defaults to a free vision-capable model so meal photo analysis works.
 */

import type { AIProvider, AIRequest, AIResponse } from "../types";
import { callOpenAICompat } from "./openai-compat";

const DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free";
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

function isKey(v: string | undefined): boolean {
  return Boolean(v && v.length > 10);
}

export const openrouterProvider: AIProvider = {
  name: "openrouter",

  isConfigured() {
    return isKey(process.env.OPENROUTER_API_KEY);
  },

  async call(req: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY ?? "";
    const baseUrl = process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL;
    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

    return callOpenAICompat(
      {
        name: "openrouter",
        baseUrl,
        apiKey,
        model,
        // OpenRouter uses these headers for analytics/leaderboards.
        // They are optional but recommended. Omitted if NEXT_PUBLIC_APP_URL
        // is not set.
        extraHeaders: {
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL ?? "https://treinohg.app",
          "X-Title": "TreinoHG",
        },
      },
      req,
    );
  },
};
