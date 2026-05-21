import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInsight, isGeminiConfigured } from "@/lib/ai";
import { getDaySummary, getProfile } from "@/lib/queries";
import { toDateKey } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/insight?date=YYYY-MM-DD
 * Returns: { insight: string, cached: boolean }
 *
 * Generates a daily AI coaching insight based on the user's data.
 * Caches for 2 hours per (user, day).
 */
export async function GET(req: Request) {
  let userId: string;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "auth_error" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? toDateKey();

  const [profile, summary] = await Promise.all([
    getProfile(),
    getDaySummary(date),
  ]);

  if (!profile?.calorie_target) {
    return NextResponse.json({
      insight:
        "Configure seu perfil (idade, peso, altura e objetivo) para receber insights personalizados.",
      cached: false,
    });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "ai_unavailable", message: "IA não configurada." },
      { status: 503 },
    );
  }

  // Check cache (2 hours)
  try {
    const supabase = createClient();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("ai_messages")
      .select("content")
      .eq("user_id", userId)
      .eq("date", date)
      .eq("kind", "insight")
      .gte("created_at", twoHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.content) {
      return NextResponse.json({ insight: cached.content, cached: true });
    }
  } catch {
    // Cache check failed — continue without it
  }

  // Build context for AI
  const context = `Meta diária: ${profile.calorie_target} kcal. Objetivo: ${profile.goal ?? "não definido"}.
Hoje: consumiu ${summary.consumed_kcal} kcal, queimou ${summary.burned_kcal} kcal, saldo ${summary.net_kcal} kcal.
Macros: ${summary.protein_g}g proteína, ${summary.carbs_g}g carbo, ${summary.fat_g}g gordura.
Refeições: ${summary.meal_count}. Treinos: ${summary.workout_count} (${summary.workout_minutes} min).
Dê um insight curto e útil.`;

  const result = await generateInsight(context);

  if (!result.ok || !result.content) {
    return NextResponse.json(
      { error: "ai_failed", message: "Falha ao gerar insight." },
      { status: 503 },
    );
  }

  // Persist to cache
  try {
    const supabase = createClient();
    await supabase.from("ai_messages").insert({
      user_id: userId,
      date,
      kind: "insight",
      content: result.content,
      context: summary as unknown as object,
    });
  } catch {
    // Don't fail the response
  }

  return NextResponse.json({ insight: result.content, cached: false });
}
