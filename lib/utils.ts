import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  addDaysToKey,
  fromBrazilDateKey,
  toBrazilDateKey,
  todayKeyBR,
} from "@/lib/timezone";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatKcal(n: number): string {
  return `${formatNumber(Math.round(n))} kcal`;
}

export function formatGrams(n: number): string {
  return `${formatNumber(Math.round(n))}g`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function pct(value: number, total: number): number {
  if (!total || total <= 0) return 0;
  return clamp((value / total) * 100, 0, 100);
}

/**
 * YYYY-MM-DD in **Brazil time** (America/Sao_Paulo).
 *
 * Historically this used `Date.getFullYear/Month/Date` which read the local
 * time zone of whatever machine was running the code — broken on a UTC server
 * around midnight Brasília. All current callers want the Brazilian calendar
 * day, so we delegate to `lib/timezone`.
 */
export function toDateKey(d: Date = new Date()): string {
  return toBrazilDateKey(d);
}

/**
 * Parse a YYYY-MM-DD key as the Brazilian calendar day (returns a Date that
 * represents noon in Brasília for that key, so locale formatting is stable).
 */
export function fromDateKey(key: string): Date {
  return fromBrazilDateKey(key);
}

/** Add days to a Date in BR-local terms. Returns a new Date instance. */
export function addDays(date: Date, days: number): Date {
  // Round-trip through the BR key so the result lines up with the BR calendar
  // even when the input came from a non-BR-aware constructor.
  const key = toBrazilDateKey(date);
  return fromBrazilDateKey(addDaysToKey(key, days));
}

export function isSameDateKey(a: string, b: string): boolean {
  return a === b;
}

/** True when the supplied YYYY-MM-DD matches today in Brazil. */
export function isToday(key: string): boolean {
  return key === todayKeyBR();
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convenience re-exports so callers can keep importing from `@/lib/utils`.
export {
  BRAZIL_TZ,
  formatBR,
  formatLongBR,
  formatShortBR,
  formatLongFullBR,
  hourInBrazil,
  timeStringBR,
  todayKeyBR,
  toBrazilDateKey,
  fromBrazilDateKey,
  addDaysToKey,
  weekdayLongBR,
  dayOfMonthBR,
  isTodayKey,
} from "@/lib/timezone";
