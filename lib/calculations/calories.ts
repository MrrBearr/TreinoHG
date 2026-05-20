import { INTENSITY_LEVELS, WORKOUT_TYPES } from "@/lib/constants";
import type { IntensityLevel, WorkoutType } from "@/lib/constants";

/**
 * MET-based calorie burn estimate.
 * kcal = MET * 3.5 * weight_kg / 200 * minutes
 */
export function estimateWorkoutCalories(args: {
  workout_type: WorkoutType;
  duration_min: number;
  weight_kg: number;
  intensity?: IntensityLevel;
}): number {
  const { workout_type, duration_min, weight_kg, intensity = "moderate" } = args;
  const wType = WORKOUT_TYPES.find((w) => w.value === workout_type);
  const intensityDef = INTENSITY_LEVELS.find((i) => i.value === intensity);
  const met = (wType?.met ?? 5.0) * (intensityDef?.multiplier ?? 1.0);
  const kcal = ((met * 3.5 * weight_kg) / 200) * duration_min;
  return Math.round(kcal);
}

export interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export function emptyMacros(): MacroTotals {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

export function sumMacros(items: Partial<MacroTotals>[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, it) => ({
      calories: acc.calories + (it.calories ?? 0),
      protein_g: acc.protein_g + (it.protein_g ?? 0),
      carbs_g: acc.carbs_g + (it.carbs_g ?? 0),
      fat_g: acc.fat_g + (it.fat_g ?? 0),
    }),
    emptyMacros(),
  );
}

export function netBalance(args: {
  consumed_kcal: number;
  burned_kcal: number;
  target_kcal: number;
}): {
  net: number;
  delta_to_target: number;
  status: "below" | "on_track" | "above";
} {
  const net = args.consumed_kcal - args.burned_kcal;
  const delta_to_target = net - args.target_kcal;
  const tolerance = args.target_kcal * 0.05; // 5% tolerance
  let status: "below" | "on_track" | "above" = "on_track";
  if (delta_to_target < -tolerance) status = "below";
  else if (delta_to_target > tolerance) status = "above";
  return { net, delta_to_target, status };
}
