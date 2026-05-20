import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeMealPhoto } from "@/lib/openai/analyze-photo";

export const runtime = "nodejs";
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

  // Allow either data URLs or http(s) URLs from Supabase Storage
  if (
    !body.image.startsWith("data:image") &&
    !body.image.startsWith("http")
  ) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  try {
    const result = await analyzeMealPhoto(body.image);
    // Persist a record for history (without applying)
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
    console.error("analyze-photo error", err);
    return NextResponse.json(
      { error: "ai_failed", message: (err as Error).message },
      { status: 500 },
    );
  }
}
