import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateFoods } from "@/lib/openai/estimate-food";
import {
  AIPipelineError,
  describeAIError,
  isTextAIConfigured,
} from "@/lib/openai/client";
import { loadCorrections } from "@/lib/nutrition/corrections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/ai/estimate-food
 *
 * Body: { query: string }
 * Returns: { foods: EstimatedFood[] }  on success.
 *          { error, message }          with status 503 when the AI pipeline
 *                                      is unavailable / failed AND the
 *                                      offline TACO/USDA fallback also
 *                                      missed the query.
 *
 * The route is the single boundary between the UI and the hybrid
 * AI + nutrition resolver. It never silently swallows AI errors — that was
 * the cause of the previous "AI quietly broke" regression.
 */
export async function POST(req: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch (err) {
    console.error(
      "[estimate-food] supabase init failed:",
      describeAIError(err),
    );
    return NextResponse.json(
      { error: "config_error", message: "Configuração inválida no servidor." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const query = (body.query ?? "").toString().trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ foods: [] });
  }
  if (query.length > 200) {
    return NextResponse.json(
      { error: "query_too_long", message: "Descrição muito longa." },
      { status: 400 },
    );
  }

  if (!isTextAIConfigured()) {
    // Even with no text AI, the local TACO dataset is still useful. Hit the
    // estimator anyway — it'll throw AIPipelineError("unavailable") if the
    // raw-query fallback also misses, which surfaces a clear message below.
    console.warn(
      "[estimate-food] text AI not configured — attempting offline TACO fallback only.",
    );
  }

  try {
    const corrections = await loadCorrections(supabase, user.id);
    const foods = await estimateFoods(query, { corrections });
    return NextResponse.json({ foods });
  } catch (err) {
    if (err instanceof AIPipelineError) {
      console.warn(
        `[estimate-food] AI pipeline ${err.reason}: ${err.message}`,
      );
      return NextResponse.json(
        {
          error: err.reason === "unavailable" ? "ai_unavailable" : "ai_failed",
          message:
            err.reason === "unavailable"
              ? "IA indisponível no momento."
              : "Falha ao estimar alimentos. Tente de novo em instantes.",
        },
        { status: 503 },
      );
    }
    console.error("[estimate-food] unexpected error:", describeAIError(err));
    return NextResponse.json(
      { error: "ai_failed", message: "Falha ao estimar." },
      { status: 503 },
    );
  }
}
