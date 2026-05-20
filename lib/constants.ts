export const APP_NAME = "TreinoHG";
export const APP_TAGLINE = "Disciplina, dados, resultado.";

export const MEAL_TYPES = [
  { value: "breakfast", label: "Café da manhã", icon: "☀️" },
  { value: "lunch", label: "Almoço", icon: "🍽️" },
  { value: "snack", label: "Lanche", icon: "🥤" },
  { value: "dinner", label: "Jantar", icon: "🌙" },
  { value: "pre_workout", label: "Pré-treino", icon: "⚡" },
  { value: "post_workout", label: "Pós-treino", icon: "💪" },
  { value: "other", label: "Outro", icon: "🍴" },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]["value"];

export const WORKOUT_TYPES = [
  { value: "legs", label: "Pernas", met: 6.0 },
  { value: "chest", label: "Peito", met: 5.5 },
  { value: "back", label: "Costas", met: 5.5 },
  { value: "shoulders", label: "Ombros", met: 5.0 },
  { value: "arms", label: "Braços", met: 5.0 },
  { value: "abs", label: "Abdômen", met: 5.0 },
  { value: "fullbody", label: "Full Body", met: 6.5 },
  { value: "cardio", label: "Cardio", met: 8.0 },
  { value: "running", label: "Corrida", met: 9.8 },
  { value: "walking", label: "Caminhada", met: 3.8 },
  { value: "treadmill", label: "Esteira", met: 7.0 },
  { value: "free", label: "Treino livre", met: 5.0 },
  { value: "rest", label: "Descanso", met: 1.0 },
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number]["value"];

export const INTENSITY_LEVELS = [
  { value: "low", label: "Leve", multiplier: 0.85 },
  { value: "moderate", label: "Moderado", multiplier: 1.0 },
  { value: "high", label: "Intenso", multiplier: 1.15 },
  { value: "extreme", label: "Extremo", multiplier: 1.3 },
] as const;

export type IntensityLevel = (typeof INTENSITY_LEVELS)[number]["value"];

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentário", factor: 1.2 },
  { value: "light", label: "Leve (1-3x/sem)", factor: 1.375 },
  { value: "moderate", label: "Moderado (3-5x/sem)", factor: 1.55 },
  { value: "active", label: "Ativo (6-7x/sem)", factor: 1.725 },
  { value: "very_active", label: "Muito ativo", factor: 1.9 },
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]["value"];

export const GOALS = [
  { value: "lose_fat", label: "Perder gordura", deficit: -0.2 },
  { value: "maintain", label: "Manter", deficit: 0 },
  { value: "gain_muscle", label: "Ganhar massa", deficit: 0.1 },
] as const;

export type Goal = (typeof GOALS)[number]["value"];

export const SEX_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
] as const;

export type Sex = (typeof SEX_OPTIONS)[number]["value"];

export const THEME_OPTIONS = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "premium", label: "Premium" },
] as const;
