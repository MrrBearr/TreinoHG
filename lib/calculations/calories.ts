import { INTENSITY_LEVELS, WORKOUT_TYPES } from "@/lib/constants";
import type { IntensityLevel, WorkoutType } from "@/lib/constants";

/**
 * MET-based calorie burn estimate.
 *
 * Formula: kcal = MET × 3.5 × weight_kg / 200 × minutes
 *
 * Conservative-by-design. The MET table in `constants.ts` is anchored on
 * the Compendium of Physical Activities and intentionally on the lower end
 * so the default ("moderate" intensity) reads as a believable real-world
 * value — most users overestimate effort, not underestimate.
 *
 * Layered safety nets:
 *  1. Strength splits get an "active fraction" deflator (`STRENGTH_ACTIVE`)
 *     because a 60-minute leg day is rarely 60 minutes of effort — typically
 *     ~65% of the time is actual lifting and the rest is rest.
 *  2. A per-minute cap (`MAX_KCAL_PER_MIN_*`) keeps the estimate believable
 *     even when the user dials extreme intensity for an hour.
 *  3. A hard total cap (2500 kcal) protects against runaway inputs.
 *
 * Rest days always return zero. Cardio types are NOT deflated — their MET
 * values already assume continuous effort.
 */
const STRENGTH_TYPES: ReadonlySet<WorkoutType> = new Set([
  "legs",
  "chest",
  "back",
  "shoulders",
  "arms",
  "abs",
  "fullbody",
  "free",
]);

/** Fraction of the logged duration that's actual effort during strength work. */
const STRENGTH_ACTIVE = 0.65;

/**
 * Per-minute calorie ceiling, by category. Even a 100kg athlete sprinting
 * full-out tops out around 18-20 kcal/min sustained. Strength work is
 * inherently lower-throughput because of inter-set rest.
 */
const MAX_KCAL_PER_MIN_CARDIO = 18;
const MAX_KCAL_PER_MIN_STRENGTH = 10;

export function estimateWorkoutCalories(args: {
  workout_type: WorkoutType;
  duration_min: number;
  weight_kg: number;
  intensity?: IntensityLevel;
}): number {
  const {
    workout_type,
    duration_min,
    weight_kg,
    intensity = "moderate",
  } = args;

  // Defensive: never produce a negative or absurdly high number.
  if (
    !Number.isFinite(duration_min) ||
    duration_min <= 0 ||
    !Number.isFinite(weight_kg) ||
    weight_kg <= 0
  ) {
    return 0;
  }

  // Rest days burn nothing in the "exercise" budget — that's the whole
  // point. They still get logged for streak/discipline reasons.
  if (workout_type === "rest") return 0;

  const wType = WORKOUT_TYPES.find((w) => w.value === workout_type);
  const intensityDef = INTENSITY_LEVELS.find((i) => i.value === intensity);
  const baseMet = wType?.met ?? 4.0;
  const intensityMult = intensityDef?.multiplier ?? 1.0;
  const met = baseMet * intensityMult;

  const isStrength = STRENGTH_TYPES.has(workout_type);
  const activeFraction = isStrength ? STRENGTH_ACTIVE : 1;

  const minutes = Math.min(duration_min, 360); // cap at 6h to neutralize bad input
  const safeWeight = Math.min(Math.max(weight_kg, 35), 250); // sanity bounds

  let kcal = ((met * 3.5 * safeWeight) / 200) * minutes * activeFraction;

  // Per-minute cap — believable upper bound even for the strongest user.
  const perMinCap = isStrength
    ? MAX_KCAL_PER_MIN_STRENGTH
    : MAX_KCAL_PER_MIN_CARDIO;
  kcal = Math.min(kcal, perMinCap * minutes);

  // Final hard ceiling: even an extreme 4h cardio session won't exceed 2500.
  return Math.max(0, Math.min(2500, Math.round(kcal)));
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
