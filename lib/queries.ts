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
import { isNextControlError } from "@/lib/next-control-errors";
import { addDaysToKey, todayKeyBR } from "@/lib/timezone";

/**
 * Defensive read layer.
 *
 * Every export catches its own errors and returns a safe default so server
 * components rendering the dashboard, history, progress, etc. never throw and
 * never trigger the production "An error occurred in the Server Components
 * render" white-screen.
 *
 * IMPORTANT: We must NOT swallow Next.js control-flow errors (redirect,
 * notFound, dynamic-server-usage). Those carry no real failure information
 * and silencing them lets Next prerender empty/anonymous HTML for
 * authenticated pages.
 */
async function safeRun<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isNextControlError(err)) throw err;
    if (process.env.NODE_ENV !== "production") {
      console.error(`[queries:${label}]`, err);
    } else {
      // Production: log without throwing the entire request.
      console.error(`[queries:${label}] failed`);
    }
    return fallback;
  }
}

export async function getCurrentUser() {
  return safeRun("getCurrentUser", async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  }, null);
}

export async function getProfile(): Promise<Profile | null> {
  return safeRun("getProfile", async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[queries:getProfile] supabase error", error.message);
      return null;
    }
    return (data as Profile) ?? null;
  }, null);
}

export async function getOrCreateDay(date: string): Promise<Day | null> {
  return safeRun("getOrCreateDay", async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Try the atomic SQL helper first; falls back to manual select/insert.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_or_create_day",
      { p_date: date },
    );
    if (!rpcError && rpcData) {
      return (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Day;
    }

    const { data: existing } = await supabase
      .from("days")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();
    if (existing) return existing as Day;

    const { data: created, error: insertError } = await supabase
      .from("days")
      .insert({ user_id: user.id, date })
      .select("*")
      .single();
    if (insertError) {
      // Likely a race producing a unique-violation; re-select.
      const { data: again } = await supabase
        .from("days")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();
      return (again as Day) ?? null;
    }
    return (created as Day) ?? null;
  }, null);
}

export async function getDayMeals(date: string): Promise<{
  meals: Meal[];
  entries: FoodEntry[];
}> {
  return safeRun(
    "getDayMeals",
    async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { meals: [], entries: [] };

      const [mealsRes, entriesRes] = await Promise.all([
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
        meals: ((mealsRes.data as Meal[]) ?? []),
        entries: ((entriesRes.data as FoodEntry[]) ?? []),
      };
    },
    { meals: [], entries: [] },
  );
}

export async function getDayWorkouts(date: string): Promise<Workout[]> {
  return safeRun(
    "getDayWorkouts",
    async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("created_at", { ascending: true });
      return (data as Workout[]) ?? [];
    },
    [],
  );
}

function emptyDaySummary(date: string): DaySummary {
  return {
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

export async function getRecentDays(days = 30): Promise<DaySummary[]> {
  return safeRun(
    "getRecentDays",
    async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // Range walks BR-local days backwards from "today in Brazil". Computing
      // the bounds in BR avoids a +/- 1 day off-by-one when the server (UTC)
      // and the user (BRT) are on different calendar days at midnight.
      const today = todayKeyBR();
      const sinceKey = addDaysToKey(today, -(days - 1));

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
        const k = addDaysToKey(sinceKey, i);
        map.set(k, emptyDaySummary(k));
      }

      const mealsSeen = new Map<string, Set<string>>();
      for (const e of entries ?? []) {
        const date = (e?.date as string | undefined) ?? "";
        const s = map.get(date);
        if (!s) continue;
        s.consumed_kcal += Number(e.calories) || 0;
        s.protein_g += Number(e.protein_g) || 0;
        s.carbs_g += Number(e.carbs_g) || 0;
        s.fat_g += Number(e.fat_g) || 0;
        const meal_id = (e?.meal_id as string | undefined) ?? "";
        if (meal_id) {
          if (!mealsSeen.has(date)) mealsSeen.set(date, new Set());
          mealsSeen.get(date)!.add(meal_id);
        }
      }
      for (const [date, set] of mealsSeen) {
        const s = map.get(date);
        if (s) s.meal_count = set.size;
      }
      for (const w of workouts ?? []) {
        const s = map.get((w?.date as string | undefined) ?? "");
        if (!s) continue;
        s.burned_kcal += Number(w.calories_burned) || 0;
        s.workout_minutes += Number(w.duration_min) || 0;
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
    },
    [],
  );
}
