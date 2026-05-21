/**
 * LLM7 provider — tertiary fallback in the chain.
 *
 * https://api.llm7.io — free OpenAI-compatible proxy. Defaults to a model
 * that supports vision so meal photo analysis still works at this level
 * of the fallback chain.
 */

import type { AIProvider, AIRequest, AIResponse } from "../types";
import { callOpenAICompat } from "./openai-compat";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.llm7.io/v1";

function isKey(v: string | undefined): boolean {
  return Boolean(v && v.length > 10);
}

export const llm7Provider: AIProvider = {
  name: "llm7",

  isConfigured() {
    return isKey(process.env.LLM7_API_KEY);
  },

  async call(req: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.LLM7_API_KEY ?? "";
    const baseUrl = process.env.LLM7_BASE_URL ?? DEFAULT_BASE_URL;
    const model = process.env.LLM7_MODEL || DEFAULT_MODEL;

    return callOpenAICompat(
      { name: "llm7", baseUrl, apiKey, model },
      req,
    );
  },
};
