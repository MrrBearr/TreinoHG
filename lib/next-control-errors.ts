/**
 * Next.js uses thrown sentinel errors for control flow. These MUST propagate
 * out of any try/catch wrapper or the framework misbehaves:
 *
 *  - `NEXT_REDIRECT`        — thrown by `redirect()`
 *  - `NEXT_NOT_FOUND`       — thrown by `notFound()`
 *  - `DYNAMIC_SERVER_USAGE` — thrown when a dynamic API (`cookies`, `headers`,
 *                             `searchParams`, etc.) is read during the static
 *                             prerender probe. Swallowing this lets Next
 *                             cache an empty/anonymous render for an
 *                             authenticated page.
 *
 * Every `safeRun`-style wrapper that touches Supabase (which reads cookies)
 * must call this and re-throw before logging.
 */

interface NextSentinelLike {
  digest?: unknown;
  message?: unknown;
}

const SENTINEL_DIGEST_PREFIXES = [
  "NEXT_REDIRECT",
  "NEXT_NOT_FOUND",
  "DYNAMIC_SERVER_USAGE",
];

export function isNextControlError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as NextSentinelLike;

  const digest = typeof e.digest === "string" ? e.digest : "";
  if (SENTINEL_DIGEST_PREFIXES.some((p) => digest.startsWith(p))) return true;

  // Next sometimes wraps DynamicServerError without a digest in dev. Match
  // the message as a defensive fallback.
  const msg = typeof e.message === "string" ? e.message : "";
  if (msg.includes("Dynamic server usage")) return true;

  return false;
}
