import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateFoods } from "@/lib/openai/estimate-food";
import { isAIConfigured } from "@/lib/openai/client";
import { loadCorrections } from "@/lib/nutrition/corrections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/ai/estimate-food
 *
 * Body: { query: string }
 * Returns: { foods: EstimatedFood[] }  (empty array on graceful failure)
 *
 * Used by the manual meal entry form to autofill calories/macros from a
 * free-text food description (e.g. "2 ovos e 100g de arroz"). Always
 * runs server-side; the API key is never exposed to the browser.
 */
export async function POST(req: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch (err) {
    console.error("[estimate-food] supabase init failed", err);
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

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "ai_unavailable", message: "IA não configurada no servidor." },
      { status: 503 },
    );
  }

  try {
    // Pull the user's correction history so foods they've edited before
    // outrank both the local TACO data and the AI estimate.
    const corrections = await loadCorrections(supabase, user.id);
    const foods = await estimateFoods(query, { corrections });
    return NextResponse.json({ foods });
  } catch (err) {
    console.error("[estimate-food] unexpected error", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Falha ao estimar." },
      { status: 503 },
    );
  }
}
