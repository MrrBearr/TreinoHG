/**
 * Server-side data queries — defensive layer.
 *
 * Every function catches its own errors and returns a safe default so
 * server components NEVER throw and production NEVER white-screens.
 */

import { createClient } from "@/lib/supabase/server";
import type { Day, FoodEntry, Meal, Profile, Workout } from "@/types/database";
import type { DaySummary } from "@/types";
import { sumMacros } from "@/lib/calculations/calories";

// ─── Safe wrapper ──────────────────────────────────────────────

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[queries:${label}]`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ─── Queries ───────────────────────────────────────────────────

export async function getCurrentUser() {
  return safe("getCurrentUser", async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }, null);
}

export async function getProfile(): Promise<Profile | null> {
  return safe("getProfile", async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) console.error("[queries:getProfile]", error.message);
    return (data as Profile) ?? null;
  }, null);
}

export async function getOrCreateDay(date: string): Promise<Day | null> {
  return safe("getOrCreateDay", async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: existing } = await supabase
      .from("days")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();
    if (existing) return existing as Day;

    const { data: created, error } = await supabase
      .from("days")
      .insert({ user_id: user.id, date })
      .select("*")
      .single();

    if (error) {
      // Race condition — row was created between select and insert
      const { data: retry } = await supabase
        .from("days")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();
      return (retry as Day) ?? null;
    }
    return (created as Day) ?? null;
  }, null);
}

export async function getDayMeals(date: string): Promise<{
  meals: Meal[];
  entries: FoodEntry[];
}> {
  return safe("getDayMeals", async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { meals: [], entries: [] };

    const [{ data: meals }, { data: entries }] = await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("created_at", { ascending: true }),
      supabase
        .from("food_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("created_at", { ascending: true }),
    ]);
    return {
      meals: (meals as Meal[]) ?? [],
      entries: (entries as FoodEntry[]) ?? [],
    };
  }, { meals: [], entries: [] });
}

export async function getDayWorkouts(date: string): Promise<Workout[]> {
  return safe("getDayWorkouts", async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at", { ascending: true });
    return (data as Workout[]) ?? [];
  }, []);
}

export async function getDaySummary(date: string): Promise<DaySummary> {
  const empty: DaySummary = {
    date,
    consumed_kcal: 0,
    burned_kcal: 0,
    net_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    meal_count: 0,
    workout_count: 0,
    workout_minutes: 0,
  };

  return safe("getDaySummary", async () => {
    const [{ entries, meals }, workouts] = await Promise.all([
      getDayMeals(date),
      getDayWorkouts(date),
    ]);
    const macros = sumMacros(
      entries.map((e) => ({
        calories: num(e.calories),
        protein_g: num(e.protein_g),
        carbs_g: num(e.carbs_g),
        fat_g: num(e.fat_g),
      })),
    );
    const burned = workouts.reduce((s, w) => s + num(w.calories_burned), 0);
    const minutes = workouts.reduce((s, w) => s + num(w.duration_min), 0);
    return {
      date,
      consumed_kcal: Math.round(macros.calories),
      burned_kcal: Math.round(burned),
      net_kcal: Math.round(macros.calories) - Math.round(burned),
      protein_g: Math.round(macros.protein_g),
      carbs_g: Math.round(macros.carbs_g),
      fat_g: Math.round(macros.fat_g),
      meal_count: meals.length,
      workout_count: workouts.length,
      workout_minutes: Math.round(minutes),
    };
  }, empty);
}

export async function getDaySummary(date: string): Promise<DaySummary> {
  return safeRun(
    "getDaySummary",
    async () => {
      const [{ entries, meals }, workouts] = await Promise.all([
        getDayMeals(date),
        getDayWorkouts(date),
      ]);
      const macros = sumMacros(
        entries.map((e) => ({
          calories: Number(e.calories) || 0,
          protein_g: Number(e.protein_g) || 0,
          carbs_g: Number(e.carbs_g) || 0,
          fat_g: Number(e.fat_g) || 0,
        })),
      );
      const burned = workouts.reduce(
        (s, w) => s + (Number(w.calories_burned) || 0),
        0,
      );
      const minutes = workouts.reduce(
        (s, w) => s + (Number(w.duration_min) || 0),
        0,
      );
      return {
        date,
        consumed_kcal: Math.round(macros.calories),
        burned_kcal: burned,
        net_kcal: Math.round(macros.calories) - burned,
        protein_g: Math.round(macros.protein_g),
        carbs_g: Math.round(macros.carbs_g),
        fat_g: Math.round(macros.fat_g),
        meal_count: meals.length,
        workout_count: workouts.length,
        workout_minutes: minutes,
      };
    },
    emptyDaySummary(date),
  );
}

/** YYYY-MM-DD in local time. Mirrors lib/utils.toDateKey to avoid UTC drift. */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getRecentDays(days = 30): Promise<DaySummary[]> {
  return safe("getRecentDays", async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const sinceKey = since.toISOString().slice(0, 10);

    const [{ data: entries }, { data: workouts }] = await Promise.all([
      supabase
        .from("food_entries")
        .select("date, calories, protein_g, carbs_g, fat_g, meal_id")
        .eq("user_id", user.id)
        .gte("date", sinceKey),
      supabase
        .from("workouts")
        .select("date, calories_burned, duration_min")
        .eq("user_id", user.id)
        .gte("date", sinceKey),
    ]);

    const map = new Map<string, DaySummary>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const k = d.toISOString().slice(0, 10);
      map.set(k, {
        date: k,
        consumed_kcal: 0,
        burned_kcal: 0,
        net_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        meal_count: 0,
        workout_count: 0,
        workout_minutes: 0,
      });
    }

    const mealsSeen = new Map<string, Set<string>>();
    for (const e of entries ?? []) {
      const dateKey = String(e.date ?? "");
      const s = map.get(dateKey);
      if (!s) continue;
      s.consumed_kcal += num(e.calories);
      s.protein_g += num(e.protein_g);
      s.carbs_g += num(e.carbs_g);
      s.fat_g += num(e.fat_g);
      const mealId = String(e.meal_id ?? "");
      if (mealId) {
        if (!mealsSeen.has(dateKey)) mealsSeen.set(dateKey, new Set());
        mealsSeen.get(dateKey)!.add(mealId);
      }
    }
    for (const [dateKey, set] of mealsSeen) {
      const s = map.get(dateKey);
      if (s) s.meal_count = set.size;
    }
    for (const w of workouts ?? []) {
      const dateKey = String(w.date ?? "");
      const s = map.get(dateKey);
      if (!s) continue;
      s.burned_kcal += num(w.calories_burned);
      s.workout_minutes += num(w.duration_min);
      s.workout_count += 1;
    }
    for (const s of map.values()) {
      s.consumed_kcal = Math.round(s.consumed_kcal);
      s.protein_g = Math.round(s.protein_g);
      s.carbs_g = Math.round(s.carbs_g);
      s.fat_g = Math.round(s.fat_g);
      s.net_kcal = s.consumed_kcal - s.burned_kcal;
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, []);
}
