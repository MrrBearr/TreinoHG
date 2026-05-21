/**
 * Shared AI types for the TreinoHG multi-provider integration.
 *
 * Provider chain: Gemini → OpenRouter → LLM7
 */

// ─── Provider abstraction ──────────────────────────────────────

export type AIProviderName = "gemini" | "openrouter" | "llm7";

/** Unified request shape that every provider knows how to translate. */
export interface AIRequest {
  /** System-level instructions (role/persona/output schema). */
  systemInstruction?: string;
  /** The user prompt. */
  userText: string;
  /** Optional image for multimodal requests. base64 = bytes only (no data: prefix). */
  image?: { mimeType: string; base64: string };
  temperature?: number;
  maxOutputTokens?: number;
  /** When true, ask the provider for JSON output (skipped automatically for image requests). */
  jsonMode?: boolean;
  /** Logical task name for logging/metrics. */
  task?: AIRequestKind;
}

export interface AIResponse {
  ok: boolean;
  text: string;
  error?: string;
  providerUsed?: AIProviderName;
  modelUsed?: string;
}

export interface AIProvider {
  name: AIProviderName;
  isConfigured(): boolean;
  call(req: AIRequest): Promise<AIResponse>;
}

export interface AIProviderHealth {
  name: AIProviderName;
  configured: boolean;
  model?: string;
  numKeys?: number;
}

export interface AIHealthResult {
  configured: boolean;
  providers: AIProviderHealth[];
}

// ─── Domain types ──────────────────────────────────────────────

export interface EstimatedFood {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface PhotoAnalysisResult {
  foods: EstimatedFood[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  confidence: number;
  summary: string;
  fallback?: boolean;
  providerUsed?: AIProviderName;
}

export interface AITextResult {
  ok: boolean;
  content: string;
  reason?: "unavailable" | "failed" | "rate_limited";
  providerUsed?: AIProviderName;
}

export interface AIEstimateResult {
  ok: boolean;
  foods: EstimatedFood[];
  reason?: "unavailable" | "failed" | "rate_limited";
  providerUsed?: AIProviderName;
}

export interface GeminiConfig {
  keys: string[];
  primaryModel: string;
  fastModel: string;
  timeout: number;
  maxRetries: number;
}

export type AIRequestKind =
  | "estimate_food"
  | "analyze_photo"
  | "insight"
  | "chat"
  | "motivation";
