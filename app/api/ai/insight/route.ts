import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDayInsight } from "@/lib/openai/insights";
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

  // If no calorie target yet, return a minimal informational message
  if (!profile?.calorie_target) {
    return NextResponse.json({
      insight:
        "Configure seu perfil (idade, peso, altura e objetivo) para receber insights personalizados.",
      cached: false,
    });
  }

  // Use cache: if we already have an insight for this day generated within last 2h, reuse
  const twoHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString();
  const { data: cached } = await supabase
    .from("ai_messages")
    .select("content")
    .eq("user_id", user.id)
    .eq("date", date)
    .eq("kind", "insight")
    .gte("created_at", twoHoursAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.content) {
    return NextResponse.json({ insight: cached.content, cached: true });
  }

  try {
    const insight = await generateDayInsight({
      profile: {
        goal: profile.goal,
        calorie_target: profile.calorie_target,
        protein_target_g: profile.protein_target_g,
        carbs_target_g: profile.carbs_target_g,
        fat_target_g: profile.fat_target_g,
        weight_kg: profile.weight_kg,
      },
      summary,
    });

    if (insight) {
      await supabase.from("ai_messages").insert({
        user_id: user.id,
        date,
        kind: "insight",
        content: insight,
        context: summary as unknown as object,
      });
    }

    return NextResponse.json({ insight, cached: false });
  } catch (err) {
    console.error("insight error", err);
    return NextResponse.json(
      { error: "ai_failed", message: (err as Error).message },
      { status: 500 },
    );
  }
}
