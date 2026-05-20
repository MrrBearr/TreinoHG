import { createClient } from "@/lib/supabase/server";
import type {
  Day,
  FoodEntry,
  Meal,
  Profile,
  Workout,
} from "@/types/database";
import type { DaySummary } from "@/types";
import { sumMacros } from "@/lib/calculations/calories";

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function getOrCreateDay(date: string): Promise<Day | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("days")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();
  if (existing) return existing as Day;

  const { data: created } = await supabase
    .from("days")
    .insert({ user_id: user.id, date })
    .select("*")
    .single();
  return (created as Day) ?? null;
}

export async function getDayMeals(date: string): Promise<{
  meals: Meal[];
  entries: FoodEntry[];
}> {
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
}

export async function getDayWorkouts(date: string): Promise<Workout[]> {
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
}

export async function getDaySummary(date: string): Promise<DaySummary> {
  const [{ entries, meals }, workouts] = await Promise.all([
    getDayMeals(date),
    getDayWorkouts(date),
  ]);
  const macros = sumMacros(
    entries.map((e) => ({
      calories: e.calories,
      protein_g: e.protein_g,
      carbs_g: e.carbs_g,
      fat_g: e.fat_g,
    })),
  );
  const burned = workouts.reduce((s, w) => s + (w.calories_burned ?? 0), 0);
  const minutes = workouts.reduce((s, w) => s + (w.duration_min ?? 0), 0);
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
}

export async function getRecentDays(days = 30): Promise<DaySummary[]> {
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
    const s = map.get(e.date as string);
    if (!s) continue;
    s.consumed_kcal += Number(e.calories ?? 0);
    s.protein_g += Number(e.protein_g ?? 0);
    s.carbs_g += Number(e.carbs_g ?? 0);
    s.fat_g += Number(e.fat_g ?? 0);
    if (!mealsSeen.has(e.date as string))
      mealsSeen.set(e.date as string, new Set());
    mealsSeen.get(e.date as string)!.add(e.meal_id as string);
  }
  for (const [date, set] of mealsSeen) {
    const s = map.get(date);
    if (s) s.meal_count = set.size;
  }
  for (const w of workouts ?? []) {
    const s = map.get(w.date as string);
    if (!s) continue;
    s.burned_kcal += Number(w.calories_burned ?? 0);
    s.workout_minutes += Number(w.duration_min ?? 0);
    s.workout_count += 1;
  }
  for (const s of map.values()) {
    s.consumed_kcal = Math.round(s.consumed_kcal);
    s.protein_g = Math.round(s.protein_g);
    s.carbs_g = Math.round(s.carbs_g);
    s.fat_g = Math.round(s.fat_g);
    s.net_kcal = s.consumed_kcal - s.burned_kcal;
  }
  return Array.from(map.values()).sort((a, b) =>
    a.date < b.date ? 1 : -1,
  );
}
