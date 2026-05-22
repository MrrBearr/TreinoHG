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
  // Strength splits — typical resistance training, MET values reflect the
  // averaged effort over an entire session including inter-set rest.
  // Compendium of Physical Activities lists 3.5 (light/moderate) up to 6.0
  // (vigorous). Defaults sit in the conservative zone so a chill leg day
  // doesn't pretend to be a hard one. Intensity multiplier moves them.
  { value: "legs", label: "Pernas", met: 4.5 },
  { value: "chest", label: "Peito", met: 4.0 },
  { value: "back", label: "Costas", met: 4.0 },
  { value: "shoulders", label: "Ombros", met: 3.8 },
  { value: "arms", label: "Braços", met: 3.5 },
  { value: "abs", label: "Abdômen", met: 3.5 },
  // Compound full-body sessions burn slightly more than isolated splits.
  { value: "fullbody", label: "Full Body", met: 5.0 },
  // Cardio family — conservative steady-state defaults. The previous values
  // assumed continuous high-intensity which over-counted for typical gym
  // cardio (light spin, easy bike, treadmill walk-jog mix).
  { value: "cardio", label: "Cardio", met: 5.5 },
  { value: "running", label: "Corrida", met: 8.0 },
  { value: "walking", label: "Caminhada", met: 3.0 },
  { value: "treadmill", label: "Esteira", met: 4.5 },
  { value: "free", label: "Treino livre", met: 4.0 },
  { value: "rest", label: "Descanso", met: 1.0 },
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number]["value"];

export const INTENSITY_LEVELS = [
  // Conservative multipliers. We anchor "moderate" at 1.0 so the per-type
  // MET tables read as the realistic baseline.
  { value: "low", label: "Leve", multiplier: 0.8 },
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


// Re-export coach personality catalog so legacy imports keep working.
// Source of truth lives in `lib/coach/personalities.ts`.
export {
  COACH_PERSONALITIES,
  DEFAULT_COACH_PERSONALITY,
  type CoachPersonalityId,
} from "./coach/personalities";
