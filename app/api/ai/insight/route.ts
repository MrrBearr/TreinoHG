import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDayInsight } from "@/lib/openai/insights";
import { isAIConfigured } from "@/lib/openai/client";
import { getDaySummary, getProfile } from "@/lib/queries";
import { toDateKey } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? toDateKey();

  const [profile, summary] = await Promise.all([
    getProfile(),
    getDaySummary(date),
  ]);

  // If no calorie target yet, return a minimal informational message.
  if (!profile?.calorie_target) {
    return NextResponse.json({
      insight:
        "Configure seu perfil (idade, peso, altura e objetivo) para receber insights personalizados.",
      cached: false,
    });
  }

  // Fail soft if the AI provider is not configured.
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "ai_unavailable", message: "IA não configurada no servidor." },
      { status: 503 },
    );
  }

  // Cache: reuse insights generated within the last 2 hours for the same day
  // AND for the same coach personality. When the user changes personality the
  // tone should update on next refresh, not after the 2h window.
  const twoHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString();
  const personalityKey = profile.coach_personality ?? "motivator";
  const { data: cached } = await supabase
    .from("ai_messages")
    .select("content, context")
    .eq("user_id", user.id)
    .eq("date", date)
    .eq("kind", "insight")
    .gte("created_at", twoHoursAgo)
    .order("created_at", { ascending: false })
    .limit(5);

  const reusable = (cached ?? []).find((row) => {
    const ctx = (row.context as { coach_personality?: string } | null) ?? null;
    return (ctx?.coach_personality ?? "motivator") === personalityKey;
  });

  if (reusable?.content) {
    return NextResponse.json({ insight: reusable.content, cached: true });
  }

  try {
    const result = await generateDayInsight({
      profile: {
        goal: profile.goal,
        calorie_target: profile.calorie_target,
        protein_target_g: profile.protein_target_g,
        carbs_target_g: profile.carbs_target_g,
        fat_target_g: profile.fat_target_g,
        weight_kg: profile.weight_kg,
        coach_personality: profile.coach_personality,
      },
      summary,
    });

    if (!result.ok || !result.content) {
      return NextResponse.json(
        {
          error: "ai_failed",
          message:
            result.reason === "unavailable"
              ? "IA indisponível no momento."
              : "Falha ao gerar insight.",
        },
        { status: 503 },
      );
    }

    await supabase.from("ai_messages").insert({
      user_id: user.id,
      date,
      kind: "insight",
      content: result.content,
      context: {
        ...summary,
        coach_personality: personalityKey,
      } as unknown as object,
    });

    return NextResponse.json({ insight: result.content, cached: false });
  } catch (err) {
    console.error("insight route error", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Falha ao gerar insight." },
      { status: 503 },
    );
  }
}
