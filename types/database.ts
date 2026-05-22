import type {
  ActivityLevel,
  Goal,
  IntensityLevel,
  MealType,
  Sex,
  WorkoutType,
} from "@/lib/constants";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  water_target_ml: number | null;
  preferred_workout_time: string | null;
  food_preferences: string | null;
  dietary_restrictions: string | null;
  theme: "light" | "dark" | "premium" | null;
  coach_personality: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Day {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  notes: string | null;
  weight_kg: number | null;
  water_ml: number | null;
  ai_summary: string | null;
  motivational_phrase: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  day_id: string;
  date: string;
  meal_type: MealType;
  name: string | null;
  time: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodEntry {
  id: string;
  user_id: string;
  meal_id: string;
  date: string;
  name: string;
  quantity: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
  source: "manual" | "ai" | "favorite";
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  day_id: string;
  date: string;
  workout_type: WorkoutType;
  name: string | null;
  duration_min: number;
  treadmill_min: number | null;
  intensity: IntensityLevel | null;
  calories_burned: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPhotoAnalysis {
  id: string;
  user_id: string;
  meal_id: string | null;
  photo_url: string;
  raw_response: unknown;
  detected_foods: AIDetectedFood[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  confidence: number;
  summary: string | null;
  applied: boolean;
  created_at: string;
}

export interface AIDetectedFood {
  name: string;
  estimated_quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AIMessage {
  id: string;
  user_id: string;
  date: string;
  kind: "insight" | "motivation" | "summary" | "answer";
  content: string;
  context: unknown | null;
  created_at: string;
}

export interface FavoriteFood {
  id: string;
  user_id: string;
  name: string;
  quantity: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  use_count: number;
  created_at: string;
}
