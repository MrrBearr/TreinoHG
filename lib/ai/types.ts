/**
 * Shared AI types for the TreinoHG Gemini integration.
 */

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
}

export interface AITextResult {
  ok: boolean;
  content: string;
  reason?: "unavailable" | "failed" | "rate_limited";
}

export interface AIEstimateResult {
  ok: boolean;
  foods: EstimatedFood[];
  reason?: "unavailable" | "failed" | "rate_limited";
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
