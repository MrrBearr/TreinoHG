import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerCoachQuestion } from "@/lib/openai/insights";
import { isAIConfigured } from "@/lib/openai/client";
import { getDaySummary, getProfile } from "@/lib/queries";
import { toDateKey } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "ai_unavailable", message: "IA não configurada no servidor." },
      { status: 503 },
    );
  }

  const [profile, summary] = await Promise.all([
    getProfile(),
    getDaySummary(toDateKey()),
  ]);

  try {
    // Always build context so coach personality is respected — even when the
    // user hasn't set targets yet. Numerical fields fall back to safe values.
    const result = await answerCoachQuestion(question, {
      profile: {
        goal: profile?.goal ?? null,
        calorie_target: profile?.calorie_target ?? null,
        protein_target_g: profile?.protein_target_g ?? null,
        carbs_target_g: profile?.carbs_target_g ?? null,
        fat_target_g: profile?.fat_target_g ?? null,
        weight_kg: profile?.weight_kg ?? null,
        coach_personality: profile?.coach_personality ?? null,
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
              : "Falha ao responder.",
        },
        { status: 503 },
      );
    }

    await supabase.from("ai_messages").insert({
      user_id: user.id,
      kind: "answer",
      content: result.content,
      context: { question } as unknown as object,
    });

    return NextResponse.json({ answer: result.content });
  } catch (err) {
    console.error("chat route error", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Falha ao responder." },
      { status: 503 },
    );
  }
}
