import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerCoach, isGeminiConfigured } from "@/lib/ai";
import { getDaySummary, getProfile } from "@/lib/queries";
import { toDateKey } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/ai/chat
 * Body: { question: string }
 * Returns: { answer: string }
 *
 * AI coach Q&A grounded in user profile and today's data.
 */
export async function POST(req: Request) {
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

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "ai_unavailable", message: "IA não configurada." },
      { status: 503 },
    );
  }

  // Build user context
  let context: string | undefined;
  try {
    const [profile, summary] = await Promise.all([
      getProfile(),
      getDaySummary(toDateKey()),
    ]);
    if (profile?.calorie_target) {
      context = `Meta: ${profile.calorie_target} kcal, objetivo ${profile.goal ?? "performance"}.
Hoje: ${summary.consumed_kcal} kcal consumidas, ${summary.burned_kcal} kcal queimadas.
Macros: P${summary.protein_g}g C${summary.carbs_g}g G${summary.fat_g}g.`;
    }
  } catch {
    // Continue without context
  }

  const result = await answerCoach(question, context);

  if (!result.ok || !result.content) {
    return NextResponse.json(
      { error: "ai_failed", message: "Falha ao responder." },
      { status: 503 },
    );
  }

  // Persist
  try {
    const supabase = createClient();
    await supabase.from("ai_messages").insert({
      user_id: userId,
      kind: "answer",
      content: result.content,
      context: { question } as unknown as object,
    });
  } catch {
    // Don't fail the response
  }

  return NextResponse.json({ answer: result.content });
}
