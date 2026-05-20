import { ACTIVITY_LEVELS, GOALS } from "@/lib/constants";
import type { ActivityLevel, Goal, Sex } from "@/lib/constants";

export interface BmrInput {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
}

/** Mifflin-St Jeor equation - BMR (kcal/day) */
export function calculateBMR({
  weight_kg,
  height_cm,
  age,
  sex,
}: BmrInput): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  const def = ACTIVITY_LEVELS.find((a) => a.value === activity);
  return bmr * (def?.factor ?? 1.55);
}

export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  const def = GOALS.find((g) => g.value === goal);
  const adj = def?.deficit ?? 0;
  return Math.round(tdee * (1 + adj));
}

/** Default macro split based on goal (g/kg of body weight for protein, then balance carbs/fat) */
export function calculateMacroTargets(
  weight_kg: number,
  calorie_target: number,
  goal: Goal,
): { protein_g: number; carbs_g: number; fat_g: number } {
  const proteinPerKg =
    goal === "gain_muscle" ? 2.0 : goal === "lose_fat" ? 2.2 : 1.8;
  const protein_g = Math.round(weight_kg * proteinPerKg);
  const fat_g = Math.round((calorie_target * 0.25) / 9);
  const remainingKcal = calorie_target - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(remainingKcal / 4));
  return { protein_g, carbs_g, fat_g };
}

export interface ProfileForCalc {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: Goal;
}

export interface CalculatedTargets {
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export function calculateAllTargets(p: ProfileForCalc): CalculatedTargets {
  const bmr = Math.round(calculateBMR(p));
  const tdee = Math.round(calculateTDEE(bmr, p.activity_level));
  const calorie_target = calculateCalorieTarget(tdee, p.goal);
  const macros = calculateMacroTargets(p.weight_kg, calorie_target, p.goal);
  return { bmr, tdee, calorie_target, ...macros };
}
