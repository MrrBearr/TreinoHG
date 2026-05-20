export * from "./database";

export interface DaySummary {
  date: string;
  consumed_kcal: number;
  burned_kcal: number;
  net_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_count: number;
  workout_count: number;
  workout_minutes: number;
}
