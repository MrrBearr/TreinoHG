/**
 * Shared AI types for the TreinoHG dual-provider integration.
 *
 *   NVIDIA   → primary for vision (meal photo analysis)
 *   TEXT_AI  → primary for text (food estimation, insights, chat)
 *
 * Each provider falls back to the other when the primary fails.
 */

// ─── Provider abstraction ──────────────────────────────────────

export type AIProviderName = "nvidia" | "text_ai";

export interface AIRequest {
  systemInstruction?: string;
  userText: string;
  /** base64 = bytes only (no data: prefix). */
  image?: { mimeType: string; base64: string };
  temperature?: number;
  maxOutputTokens?: number;
  /** When true, ask provider for JSON output (auto-skipped for image requests). */
  jsonMode?: boolean;
  /** Logical task name for logging. */
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
  baseUrl?: string;
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

export type AIRequestKind =
  | "estimate_food"
  | "analyze_photo"
  | "insight"
  | "chat"
  | "motivation";
