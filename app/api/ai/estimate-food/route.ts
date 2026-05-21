import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateFoods, isGeminiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/ai/estimate-food
 * Body: { query: string }
 * Returns: { foods: EstimatedFood[] }
 *
 * Used by manual meal entry to auto-estimate calories/macros from text.
 * Always server-side; keys never exposed to client.
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "auth_error" }, { status: 401 });
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
      { error: "query_too_long" },
      { status: 400 },
    );
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "ai_unavailable", message: "IA não configurada." },
      { status: 503 },
    );
  }

  const result = await estimateFoods(query);

  if (!result.ok) {
    return NextResponse.json(
      { error: "ai_failed", foods: [] },
      { status: 503 },
    );
  }

  return NextResponse.json({ foods: result.foods });
}
