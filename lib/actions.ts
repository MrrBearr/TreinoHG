"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAllTargets } from "@/lib/calculations/nutrition";
import { estimateWorkoutCalories } from "@/lib/calculations/calories";
import type {
  ActivityLevel,
  Goal,
  IntensityLevel,
  MealType,
  Sex,
  WorkoutType,
} from "@/lib/constants";
import type { AIDetectedFood } from "@/types/database";

async function ensureUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function ensureDay(date: string) {
  const { supabase, user } = await ensureUser();
  const { data: existing } = await supabase
    .from("days")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();
  if (existing) return { supabase, user, day_id: existing.id as string };
  const { data, error } = await supabase
    .from("days")
    .insert({ user_id: user.id, date })
    .select("id")
    .single();
  if (error) throw error;
  return { supabase, user, day_id: data!.id as string };
}

// ====================== PROFILE ======================
export async function updateProfile(formData: FormData) {
  const { supabase, user } = await ensureUser();

  const get = (k: string) => (formData.get(k)?.toString() || "").trim();
  const num = (k: string) => {
    const v = get(k);
    return v ? Number(v) : null;
  };

  const profile = {
    display_name: get("display_name") || null,
    age: num("age"),
    sex: (get("sex") as Sex) || null,
    height_cm: num("height_cm"),
    weight_kg: num("weight_kg"),
    activity_level: (get("activity_level") as ActivityLevel) || null,
    goal: (get("goal") as Goal) || null,
    food_preferences: get("food_preferences") || null,
    dietary_restrictions: get("dietary_restrictions") || null,
    preferred_workout_time: get("preferred_workout_time") || null,
    water_target_ml: num("water_target_ml"),
    onboarded: true,
    updated_at: new Date().toISOString(),
  };

  let calorie_target = num("calorie_target");
  let protein_target_g = num("protein_target_g");
  let carbs_target_g = num("carbs_target_g");
  let fat_target_g = num("fat_target_g");

  if (
    profile.weight_kg &&
    profile.height_cm &&
    profile.age &&
    profile.sex &&
    profile.activity_level &&
    profile.goal
  ) {
    const t = calculateAllTargets({
      weight_kg: profile.weight_kg,
      height_cm: profile.height_cm,
      age: profile.age,
      sex: profile.sex,
      activity_level: profile.activity_level,
      goal: profile.goal,
    });
    calorie_target = calorie_target ?? t.calorie_target;
    protein_target_g = protein_target_g ?? t.protein_g;
    carbs_target_g = carbs_target_g ?? t.carbs_g;
    fat_target_g = fat_target_g ?? t.fat_g;
  }

  await supabase
    .from("profiles")
    .update({
      ...profile,
      calorie_target,
      protein_target_g,
      carbs_target_g,
      fat_target_g,
    })
    .eq("user_id", user.id);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function updateTheme(theme: "light" | "dark" | "premium") {
  const { supabase, user } = await ensureUser();
  await supabase.from("profiles").update({ theme }).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

// ====================== MEALS ======================
export interface FoodEntryInput {
  name: string;
  quantity?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string;
  source?: "manual" | "ai" | "favorite";
}

export async function addMeal(args: {
  date: string;
  meal_type: MealType;
  name?: string;
  time?: string;
  notes?: string;
  photo_url?: string;
  entries: FoodEntryInput[];
}) {
  const { supabase, user, day_id } = await ensureDay(args.date);

  const { data: meal, error: mealErr } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      day_id,
      date: args.date,
      meal_type: args.meal_type,
      name: args.name ?? null,
      time: args.time ?? null,
      notes: args.notes ?? null,
      photo_url: args.photo_url ?? null,
    })
    .select("id")
    .single();
  if (mealErr) throw mealErr;

  if (args.entries.length > 0) {
    const rows = args.entries.map((e) => ({
      user_id: user.id,
      meal_id: meal!.id,
      date: args.date,
      name: e.name,
      quantity: e.quantity ?? null,
      calories: e.calories,
      protein_g: e.protein_g,
      carbs_g: e.carbs_g,
      fat_g: e.fat_g,
      notes: e.notes ?? null,
      source: e.source ?? "manual",
    }));
    await supabase.from("food_entries").insert(rows);
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/history/${args.date}`);
  return { meal_id: meal!.id as string };
}

export async function deleteMeal(meal_id: string, date: string) {
  const { supabase, user } = await ensureUser();
  await supabase.from("meals").delete().eq("id", meal_id).eq("user_id", user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/history/${date}`);
}

export async function deleteFoodEntry(entry_id: string, date: string) {
  const { supabase, user } = await ensureUser();
  await supabase
    .from("food_entries")
    .delete()
    .eq("id", entry_id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/history/${date}`);
}

// ====================== WORKOUTS ======================
export async function addWorkout(args: {
  date: string;
  workout_type: WorkoutType;
  name?: string;
  duration_min: number;
  treadmill_min?: number;
  intensity?: IntensityLevel;
  calories_burned?: number;
  notes?: string;
}) {
  const { supabase, user, day_id } = await ensureDay(args.date);

  // Auto-estimate if not provided
  let burned = args.calories_burned;
  if (burned == null || burned === 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("weight_kg")
      .eq("user_id", user.id)
      .maybeSingle();
    const weight_kg = Number(profile?.weight_kg) || 70;
    burned = estimateWorkoutCalories({
      workout_type: args.workout_type,
      duration_min: args.duration_min,
      weight_kg,
      intensity: args.intensity,
    });
  }

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      day_id,
      date: args.date,
      workout_type: args.workout_type,
      name: args.name ?? null,
      duration_min: args.duration_min,
      treadmill_min: args.treadmill_min ?? null,
      intensity: args.intensity ?? null,
      calories_burned: burned,
      notes: args.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/dashboard");
  revalidatePath(`/history/${args.date}`);
  return { workout_id: data!.id as string };
}

export async function deleteWorkout(workout_id: string, date: string) {
  const { supabase, user } = await ensureUser();
  await supabase
    .from("workouts")
    .delete()
    .eq("id", workout_id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/history/${date}`);
}

// ====================== AI Photo Analysis ======================
export async function applyPhotoAnalysis(args: {
  date: string;
  meal_type: MealType;
  meal_name?: string;
  photo_url?: string;
  detected_foods: AIDetectedFood[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  confidence: number;
  summary?: string;
}) {
  const { supabase, user } = await ensureUser();

  const { meal_id } = await addMeal({
    date: args.date,
    meal_type: args.meal_type,
    name: args.meal_name,
    photo_url: args.photo_url,
    entries: args.detected_foods.map((f) => ({
      name: f.name,
      quantity: f.estimated_quantity,
      calories: f.calories,
      protein_g: f.protein,
      carbs_g: f.carbs,
      fat_g: f.fat,
      source: "ai",
    })),
  });

  await supabase.from("meal_photo_analyses").insert({
    user_id: user.id,
    meal_id,
    photo_url: args.photo_url ?? "",
    detected_foods: args.detected_foods,
    total_calories: args.total_calories,
    total_protein_g: args.total_protein,
    total_carbs_g: args.total_carbs,
    total_fat_g: args.total_fat,
    confidence: args.confidence,
    summary: args.summary ?? null,
    applied: true,
  });

  return { meal_id };
}

// ====================== Day notes ======================
export async function updateDayNotes(args: {
  date: string;
  notes?: string;
  weight_kg?: number;
  water_ml?: number;
}) {
  const { supabase, user, day_id } = await ensureDay(args.date);
  await supabase
    .from("days")
    .update({
      notes: args.notes ?? null,
      weight_kg: args.weight_kg ?? null,
      water_ml: args.water_ml ?? null,
    })
    .eq("id", day_id)
    .eq("user_id", user.id);
  revalidatePath(`/history/${args.date}`);
}

// ====================== Copy a day ======================
export async function copyDayMeals(from_date: string, to_date: string) {
  const { supabase, user } = await ensureUser();

  const { data: srcMeals } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", from_date);
  if (!srcMeals?.length) return { copied: 0 };

  const { data: srcEntries } = await supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", from_date);

  let copied = 0;
  for (const m of srcMeals) {
    await addMeal({
      date: to_date,
      meal_type: m.meal_type,
      name: m.name ?? undefined,
      time: m.time ?? undefined,
      notes: m.notes ?? undefined,
      entries: (srcEntries ?? [])
        .filter((e) => e.meal_id === m.id)
        .map((e) => ({
          name: e.name,
          quantity: e.quantity ?? undefined,
          calories: Number(e.calories),
          protein_g: Number(e.protein_g),
          carbs_g: Number(e.carbs_g),
          fat_g: Number(e.fat_g),
          notes: e.notes ?? undefined,
          source: "manual" as const,
        })),
    });
    copied++;
  }
  revalidatePath(`/history/${to_date}`);
  return { copied };
}
