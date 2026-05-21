import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeMealPhoto, isGeminiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/analyze-photo
 * Body: { image: string (base64 data URL or http URL) }
 * Returns: PhotoAnalysisResult | { error, message, details? }
 *
 * Analyzes a meal photo using Gemini Vision. Never auto-saves —
 * user must confirm before persisting.
 */
export async function POST(req: Request) {
  // Auth check (using same supabase client throughout for shared session)
  const supabase = createClient();
  let userId: string;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[analyze-photo] No user — returning 401");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (err) {
    console.error("[analyze-photo] Auth error:", err);
    return NextResponse.json({ error: "auth_error" }, { status: 401 });
  }

  // Parse body
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
    console.error("[analyze-photo] Gemini not configured");
    return NextResponse.json(
      {
        error: "ai_unavailable",
        message: "IA não configurada no servidor.",
      },
      { status: 503 },
    );
  }

  // Detect mime type from data URL
  let mimeType = "image/jpeg";
  const mimeMatch = body.image.match(/^data:(image\/[^;]+);/);
  if (mimeMatch) mimeType = mimeMatch[1];

  console.log(
    `[analyze-photo] Analyzing image (mime=${mimeType}, size=${body.image.length} bytes)`,
  );

  // Call Gemini
  const result = await analyzeMealPhoto(body.image, mimeType);

  if (result.fallback) {
    console.error("[analyze-photo] AI returned fallback:", result.summary);
    return NextResponse.json(
      {
        error: "ai_failed",
        message: result.summary || "Falha ao analisar.",
        ...result,
      },
      { status: 503 },
    );
  }

  console.log(
    `[analyze-photo] Success: ${result.foods.length} foods, ${result.total_calories} kcal`,
  );

  // Store analysis record (non-blocking)
  try {
    const { error: insertErr } = await supabase
      .from("meal_photo_analyses")
      .insert({
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
    if (insertErr) {
      console.error(
        "[analyze-photo] Failed to save analysis record:",
        insertErr.message,
      );
    }
  } catch (err) {
    console.error("[analyze-photo] Failed to persist analysis:", err);
  }

  return NextResponse.json(result);
}
