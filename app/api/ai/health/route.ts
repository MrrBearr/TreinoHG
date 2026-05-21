import { NextResponse } from "next/server";
import { callGemini, getGeminiHealth } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/health
 *
 * Diagnostic endpoint that reports whether Gemini is configured and
 * (optionally) makes a test call. No auth required so you can verify
 * provider connectivity even when sessions are misbehaving.
 *
 * Query params:
 *   ?test=1   — perform an actual Gemini call to verify end-to-end
 *
 * Returns: { configured, numKeys, primaryModel, fastModel, test? }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runTest = searchParams.get("test") === "1";

  const health = getGeminiHealth();
  const response: Record<string, unknown> = { ...health };

  if (runTest && health.configured) {
    try {
      const res = await callGemini({
        model: "fast",
        systemInstruction: "Reply in exactly one word.",
        contents: [
          { role: "user", parts: [{ text: "Say PONG." }] },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 10 },
      });
      response.test = {
        ok: res.ok,
        text: res.text.slice(0, 50),
        error: res.error,
        keyIndex: res.keyIndex,
        modelUsed: res.modelUsed,
      };
    } catch (err) {
      response.test = {
        ok: false,
        error: (err as Error).message,
      };
    }
  } else if (runTest && !health.configured) {
    response.test = { ok: false, error: "No keys configured" };
  }

  return NextResponse.json(response);
}
