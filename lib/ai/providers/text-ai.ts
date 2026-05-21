/**
 * TEXT_AI provider — primary for text tasks (food estimation, insights, chat).
 *
 * Generic OpenAI-compatible provider. Defaults to Groq for fast & free
 * inference, but works with any OpenAI-compatible endpoint:
 *   - Groq          https://api.groq.com/openai/v1
 *   - Together.ai   https://api.together.xyz/v1
 *   - OpenRouter    https://openrouter.ai/api/v1
 *   - OpenAI        https://api.openai.com/v1
 *
 * Configure via env:
 *   TEXT_AI_API_KEY   (required)
 *   TEXT_AI_BASE_URL  (defaults to Groq)
 *   TEXT_AI_MODEL     (defaults to llama-3.3-70b-versatile)
 */

import type { AIProvider, AIRequest, AIResponse } from "../types";
import { callOpenAICompat } from "./openai-compat";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

function isKey(v: string | undefined): boolean {
  return Boolean(v && v.length > 10);
}

export const textAIProvider: AIProvider = {
  name: "text_ai",

  isConfigured() {
    return isKey(process.env.TEXT_AI_API_KEY);
  },

  async call(req: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.TEXT_AI_API_KEY ?? "";
    const baseUrl = process.env.TEXT_AI_BASE_URL || DEFAULT_BASE_URL;
    const model = process.env.TEXT_AI_MODEL || DEFAULT_MODEL;

    return callOpenAICompat(
      { name: "text_ai", baseUrl, apiKey, model },
      req,
    );
  },
};
