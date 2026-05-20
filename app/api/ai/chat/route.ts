import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerCoachQuestion } from "@/lib/openai/insights";
import { getDaySummary, getProfile } from "@/lib/queries";
import { toDateKey } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const question = (body.question ?? "").toString().trim();
  if (!question) {
    return NextResponse.json({ error: "empty_question" }, { status: 400 });
  }

  const [profile, summary] = await Promise.all([
    getProfile(),
    getDaySummary(toDateKey()),
  ]);

  try {
    const answer = await answerCoachQuestion(
      question,
      profile?.calorie_target
        ? {
            profile: {
              goal: profile.goal,
              calorie_target: profile.calorie_target,
              protein_target_g: profile.protein_target_g,
              carbs_target_g: profile.carbs_target_g,
              fat_target_g: profile.fat_target_g,
              weight_kg: profile.weight_kg,
            },
            summary,
          }
        : undefined,
    );

    await supabase.from("ai_messages").insert({
      user_id: user.id,
      kind: "answer",
      content: answer,
      context: { question } as unknown as object,
    });

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("chat error", err);
    return NextResponse.json(
      { error: "ai_failed", message: (err as Error).message },
      { status: 500 },
    );
  }
}
