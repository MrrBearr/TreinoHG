import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeMealPhoto } from "@/lib/openai/analyze-photo";
import { isVisionAIConfigured } from "@/lib/openai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.image || typeof body.image !== "string") {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  // Allow either data URLs or http(s) URLs from Supabase Storage.
  if (
    !body.image.startsWith("data:image") &&
    !body.image.startsWith("http")
  ) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  // Vision is the NVIDIA channel — checked separately from the text channel
  // because the two providers are independent.
  if (!isVisionAIConfigured()) {
    return NextResponse.json(
      {
        error: "ai_unavailable",
        message: "IA de imagem não configurada no servidor.",
      },
      { status: 503 },
    );
  }

  try {
    // Load coach personality so the summary respects the user's chosen tone.
    const { data: profile } = await supabase
      .from("profiles")
      .select("coach_personality")
      .eq("user_id", user.id)
      .maybeSingle();

    const result = await analyzeMealPhoto(body.image, {
      personality: profile?.coach_personality ?? null,
    });

    // analyzeMealPhoto never throws; it returns a fallback shape when the
    // provider was unavailable or the response was malformed. Surface that
    // as a 503 so the existing UI error handling kicks in.
    if (result.fallback) {
      return NextResponse.json(
        {
          error: "ai_failed",
          message:
            result.summary ||
            "Falha ao analisar a foto. Tente novamente.",
        },
        { status: 503 },
      );
    }

    // Persist a record for history (without applying).
    await supabase.from("meal_photo_analyses").insert({
      user_id: user.id,
      photo_url: body.image.startsWith("http") ? body.image : "",
      raw_response: result as unknown as object,
      detected_foods: result.foods,
      total_calories: result.total_calories,
      total_protein_g: result.total_protein,
      total_carbs_g: result.total_carbs,
      total_fat_g: result.total_fat,
      confidence: result.confidence,
      summary: result.summary,
      applied: false,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze-photo route error", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Falha ao analisar a foto." },
      { status: 503 },
    );
  }
}
