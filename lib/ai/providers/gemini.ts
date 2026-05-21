/**
 * Gemini provider adapter.
 *
 * Wraps the existing gemini-client.ts (which has its own 3-key failover)
 * behind the unified AIProvider interface so it can participate in the
 * provider chain alongside OpenRouter and LLM7.
 */

import { callGemini, type GeminiPart } from "../gemini-client";
import type { AIProvider, AIRequest, AIResponse } from "../types";

function isKey(v: string | undefined): boolean {
  return Boolean(v && v.length > 10);
}

export const geminiProvider: AIProvider = {
  name: "gemini",

  isConfigured() {
    return (
      isKey(process.env.GEMINI_API_KEY_1) ||
      isKey(process.env.GEMINI_API_KEY_2) ||
      isKey(process.env.GEMINI_API_KEY_3)
    );
  },

  async call(req: AIRequest): Promise<AIResponse> {
    const parts: GeminiPart[] = [{ text: req.userText }];
    if (req.image) {
      parts.push({
        inlineData: { mimeType: req.image.mimeType, data: req.image.base64 },
      });
    }

    const res = await callGemini({
      // Use primary (more capable) for image, fast for text
      model: req.image ? "primary" : "fast",
      systemInstruction: req.systemInstruction,
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: req.temperature,
        maxOutputTokens: req.maxOutputTokens,
        // Gemini supports responseMimeType for text but the inner client
        // already skips it for multimodal — pass through.
        responseMimeType: req.jsonMode ? "application/json" : undefined,
      },
    });

    return {
      ok: res.ok,
      text: res.text,
      error: res.error,
      providerUsed: "gemini",
      modelUsed: res.modelUsed,
    };
  },
};
