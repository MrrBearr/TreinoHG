/**
 * Brazil-aware date/time helpers.
 *
 * The whole app treats user-facing days in `America/Sao_Paulo` (BRT, UTC-3).
 * The Vercel/Node server runs in UTC; the browser runs in the user's locale.
 * Using these helpers everywhere guarantees:
 *
 *  - "Hoje" on the dashboard is the Brazilian calendar day
 *  - History entries land on the correct day even when the server is in UTC
 *  - Day boundaries / week navigation never drift by ±1 day around midnight
 *  - All persisted date keys (YYYY-MM-DD) are produced from BR-local time
 *
 * Implementation note: we always go through `Intl.DateTimeFormat` with the
 * `America/Sao_Paulo` time zone. This is robust to any future DST changes
 * (Brazil dropped DST in 2019 but the helper would still work if it returned).
 */

export const BRAZIL_TZ = "America/Sao_Paulo";

const partsCache = new Map<string, Intl.DateTimeFormat>();

function fmt(opts: Intl.DateTimeFormatOptions, locale = "en-CA"): Intl.DateTimeFormat {
  // Cache by serialized options + locale because instantiation is non-trivial.
  const key = locale + JSON.stringify(opts);
  let f = partsCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: BRAZIL_TZ, ...opts });
    partsCache.set(key, f);
  }
  return f;
}

interface BrParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number; // 0..23
  minute: number; // 0..59
  weekday: number; // 0..6 (Sun..Sat) — matches Date.getDay convention
}

function partsInBrazil(d: Date): BrParts {
  const formatter = fmt({
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const out: Record<string, string> = {};
  for (const p of formatter.formatToParts(d)) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  // weekday short in en-CA: "Sun","Mon"...
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    // Intl returns "24" for midnight in some locales — clamp to 0..23.
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    weekday: weekdayMap[out.weekday ?? "Sun"] ?? 0,
  };
}

/** YYYY-MM-DD for the calendar day of `d` in Brazil. */
export function toBrazilDateKey(d: Date = new Date()): string {
  const { year, month, day } = partsInBrazil(d);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Today in Brazil as YYYY-MM-DD. */
export function todayKeyBR(): string {
  return toBrazilDateKey(new Date());
}

/**
 * Parse a "YYYY-MM-DD" key into a Date that represents 12:00 (noon) of that
 * day in Brazil. Noon is used (instead of midnight) so .toLocaleDateString
 * always lands on the intended calendar day even if some locale arithmetic
 * shifts ±1 hour. Brazil hasn't had DST since 2019; this is belt-and-braces.
 */
export function fromBrazilDateKey(key: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return new Date(NaN);
  const [, y, mo, d] = m;
  // 12:00 BRT = 15:00 UTC
  return new Date(`${y}-${mo}-${d}T12:00:00-03:00`);
}

/** Add `days` to a YYYY-MM-DD key in BR-local terms; returns a new key. */
export function addDaysToKey(key: string, days: number): string {
  const d = fromBrazilDateKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toBrazilDateKey(d);
}

/** Current hour 0..23 in Brazil — used for greetings and meal-type guessing. */
export function hourInBrazil(d: Date = new Date()): number {
  return partsInBrazil(d).hour;
}

/** Current "HH:MM" in Brazil — used as a default time on meal/workout forms. */
export function timeStringBR(d: Date = new Date()): string {
  const { hour, minute } = partsInBrazil(d);
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** Formats a date/key for display in pt-BR using a custom Intl options object. */
export function formatBR(
  input: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const d = typeof input === "string" ? fromBrazilDateKey(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return fmt(options, "pt-BR").format(d);
}

/** "segunda-feira, 22 de maio". */
export function formatLongBR(input: Date | string): string {
  return formatBR(input, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/** "qua, 22 de mai". */
export function formatShortBR(input: Date | string): string {
  return formatBR(input, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

/** "22 de maio de 2026". */
export function formatLongFullBR(input: Date | string): string {
  return formatBR(input, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Just the weekday in pt-BR ("segunda-feira"). */
export function weekdayLongBR(input: Date | string): string {
  return formatBR(input, { weekday: "long" });
}

/** Just the day-of-month number in BR (1..31). */
export function dayOfMonthBR(input: Date | string): number {
  const d = typeof input === "string" ? fromBrazilDateKey(input) : input;
  return partsInBrazil(d).day;
}

/** True if `key` is today's BR calendar day. */
export function isTodayKey(key: string): boolean {
  return key === todayKeyBR();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
