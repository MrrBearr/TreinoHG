/**
 * NVIDIA NIM provider — primary for vision tasks.
 *
 * https://integrate.api.nvidia.com — OpenAI-compatible Chat Completions API
 * hosting vision-capable models:
 *   - meta/llama-3.2-90b-vision-instruct (default)
 *   - microsoft/phi-3-vision-128k-instruct
 *
 * Free tier offers credits per model, so we keep requests focused and
 * fall back to TEXT_AI in chain.ts if NVIDIA fails.
 */

import type { AIProvider, AIRequest, AIResponse } from "../types";
import { callOpenAICompat } from "./openai-compat";

const DEFAULT_MODEL = "meta/llama-3.2-90b-vision-instruct";
const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

function isKey(v: string | undefined): boolean {
  return Boolean(v && v.length > 10);
}

export const nvidiaProvider: AIProvider = {
  name: "nvidia",

  isConfigured() {
    return isKey(process.env.NVIDIA_API_KEY);
  },

  async call(req: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.NVIDIA_API_KEY ?? "";
    const baseUrl = process.env.NVIDIA_BASE_URL || DEFAULT_BASE_URL;
    const model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;

    return callOpenAICompat(
      { name: "nvidia", baseUrl, apiKey, model },
      req,
    );
  },
};
