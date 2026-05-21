import { NextResponse } from "next/server";
import { getAIHealth, runAIRequest } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/health
 *
 * Diagnostic endpoint that reports which AI providers are configured.
 * No auth required so you can verify connectivity even when sessions
 * are misbehaving.
 *
 * Query params:
 *   ?test=1  — perform an actual round-trip through the provider chain
 *
 * Returns:
 *   { configured, providers: [{name, configured, model, numKeys?}], test? }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runTest = searchParams.get("test") === "1";

  const health = getAIHealth();
  const response: Record<string, unknown> = { ...health };

  if (runTest) {
    if (!health.configured) {
      response.test = {
        ok: false,
        error: "No AI providers configured",
      };
    } else {
      try {
        const res = await runAIRequest({
          systemInstruction: "Reply in exactly one word.",
          userText: "Say PONG.",
          temperature: 0,
          maxOutputTokens: 10,
          task: "chat",
        });
        response.test = {
          ok: res.ok,
          text: res.text.slice(0, 50),
          error: res.error,
          providerUsed: res.providerUsed,
          modelUsed: res.modelUsed,
        };
      } catch (err) {
        response.test = {
          ok: false,
          error: (err as Error).message,
        };
      }
    }
  }

  return NextResponse.json(response);
}
