import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateFoods, isGeminiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/estimate-food
 * Body: { query: string }
 * Returns: { foods: EstimatedFood[] } | { error, message, details? }
 *
 * Used by manual meal entry to auto-estimate calories/macros from text.
 * Always server-side; keys never exposed to client.
 */
export async function POST(req: Request) {
  // Auth check
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[estimate-food] No user — returning 401");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } catch (err) {
    console.error("[estimate-food] Auth error:", err);
    return NextResponse.json({ error: "auth_error" }, { status: 401 });
  }

  // Parse body
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
      { error: "query_too_long", message: "Texto muito longo." },
      { status: 400 },
    );
  }

  if (!isGeminiConfigured()) {
    console.error("[estimate-food] Gemini not configured");
    return NextResponse.json(
      {
        error: "ai_unavailable",
        message: "IA não configurada no servidor. Verifique GEMINI_API_KEY_*.",
        foods: [],
      },
      { status: 503 },
    );
  }

  const result = await estimateFoods(query);

  if (!result.ok) {
    console.error(`[estimate-food] AI failed (reason=${result.reason})`);
    return NextResponse.json(
      {
        error: "ai_failed",
        message: "A IA não conseguiu estimar agora. Tente novamente.",
        reason: result.reason,
        foods: [],
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ foods: result.foods });
}
