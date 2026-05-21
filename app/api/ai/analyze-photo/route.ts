import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeMealPhoto, isGeminiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/analyze-photo
 * Body: { image: string (base64 data URL or http URL) }
 * Returns: PhotoAnalysisResult
 *
 * Analyzes a meal photo using Gemini Vision. Never auto-saves —
 * user must confirm before persisting.
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

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.image || typeof body.image !== "string") {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  if (
    !body.image.startsWith("data:image") &&
    !body.image.startsWith("http")
  ) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "ai_unavailable", message: "IA não configurada." },
      { status: 503 },
    );
  }

  // Detect mime type from data URL
  let mimeType = "image/jpeg";
  const mimeMatch = body.image.match(/^data:(image\/[^;]+);/);
  if (mimeMatch) mimeType = mimeMatch[1];

  const result = await analyzeMealPhoto(body.image, mimeType);

  if (result.fallback) {
    return NextResponse.json(
      { error: "ai_failed", message: result.summary, ...result },
      { status: 503 },
    );
  }

  // Store analysis record (not applied until user confirms)
  try {
    const supabase = createClient();
    await supabase.from("meal_photo_analyses").insert({
      user_id: userId,
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
  } catch (err) {
    console.error("[analyze-photo] failed to persist analysis record", err);
    // Don't fail the response — user can still use the results
  }

  return NextResponse.json(result);
}
