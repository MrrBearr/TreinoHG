/**
 * Centralized site-URL resolution for auth redirects.
 *
 * Resolution order (first match wins):
 *   1. NEXT_PUBLIC_APP_URL                 — explicit production URL (preferred)
 *   2. window.location.origin (browser)    — runtime origin in the browser
 *   3. https://{VERCEL_URL} (server)       — auto-set on Vercel deployments
 *   4. http://localhost:3000               — local dev fallback
 *
 * Always set NEXT_PUBLIC_APP_URL on Vercel to your stable production domain
 * (e.g. https://treinohg.vercel.app). VERCEL_URL points at the per-deployment
 * URL, which changes on every push and is not safe for email links.
 */

function strip(u: string): string {
  return u.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return strip(explicit);

  if (typeof window !== "undefined" && window.location?.origin) {
    return strip(window.location.origin);
  }

  const vercel = process.env.VERCEL_URL;
  if (vercel) return strip(`https://${vercel}`);

  return "http://localhost:3000";
}

/**
 * Build an absolute URL for an in-app path. Always prefer this over
 * `window.location.origin` when constructing auth redirects so links sent in
 * confirmation emails point at the deployed domain.
 */
export function getRedirectUrl(path: string = "/"): string {
  const base = getSiteUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
