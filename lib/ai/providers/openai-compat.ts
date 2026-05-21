/**
 * Shared OpenAI-compatible client used by both OpenRouter and LLM7.
 *
 * Both providers implement the OpenAI Chat Completions API spec, so we
 * route through a single function and just vary the base URL, model, and
 * extra headers. Supports text and vision (multimodal) requests.
 */

import type { AIProviderName, AIRequest, AIResponse } from "../types";

export interface OpenAICompatConfig {
  name: AIProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Provider-specific headers (e.g. OpenRouter requires HTTP-Referer + X-Title). */
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

export async function callOpenAICompat(
  config: OpenAICompatConfig,
  req: AIRequest,
): Promise<AIResponse> {
  const messages: ChatMessage[] = [];

  if (req.systemInstruction) {
    messages.push({ role: "system", content: req.systemInstruction });
  }

  if (req.image) {
    // Multimodal: content is an array of parts, image is sent as data URL
    messages.push({
      role: "user",
      content: [
        { type: "text", text: req.userText },
        {
          type: "image_url",
          image_url: {
            url: `data:${req.image.mimeType};base64,${req.image.base64}`,
          },
        },
      ],
    });
  } else {
    // Text-only
    messages.push({ role: "user", content: req.userText });
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: req.temperature ?? 0.3,
    max_tokens: req.maxOutputTokens ?? 1200,
  };

  // response_format is OpenAI-spec but not always honored by free providers,
  // and frequently rejected for vision requests. Only set for text + jsonMode.
  if (req.jsonMode && !req.image) {
    body.response_format = { type: "json_object" };
  }

  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      config.timeoutMs ?? 50_000,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error(
        `[${config.name}] HTTP ${response.status}: ${errBody.slice(0, 300)}`,
      );
      return {
        ok: false,
        text: "",
        error: `${config.name} ${response.status}: ${errBody.slice(0, 200)}`,
        providerUsed: config.name,
        modelUsed: config.model,
      };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = json?.choices?.[0]?.message?.content ?? "";

    if (!text) {
      console.warn(`[${config.name}] Returned empty content`);
      return {
        ok: false,
        text: "",
        error: `${config.name} returned empty response`,
        providerUsed: config.name,
        modelUsed: config.model,
      };
    }

    console.log(
      `[${config.name}] Success (${text.length} chars, model=${config.model})`,
    );
    return {
      ok: true,
      text,
      providerUsed: config.name,
      modelUsed: config.model,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.error(
      `[${config.name}] ${isTimeout ? "timeout" : "network error"}: ${(err as Error).message}`,
    );
    return {
      ok: false,
      text: "",
      error: `${config.name} ${isTimeout ? "timeout" : "network error"}: ${(err as Error).message}`,
      providerUsed: config.name,
      modelUsed: config.model,
    };
  }
}
