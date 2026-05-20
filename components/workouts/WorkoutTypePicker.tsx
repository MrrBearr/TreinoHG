"use client";

import {
  Dumbbell,
  Activity,
  Footprints,
  Heart,
  Bed,
  Mountain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKOUT_TYPES, type WorkoutType } from "@/lib/constants";

const ICONS: Record<WorkoutType, React.ComponentType<{ className?: string }>> = {
  legs: Dumbbell,
  chest: Dumbbell,
  back: Dumbbell,
  shoulders: Dumbbell,
  arms: Dumbbell,
  abs: Dumbbell,
  fullbody: Dumbbell,
  cardio: Heart,
  running: Activity,
  walking: Footprints,
  treadmill: Activity,
  free: Mountain,
  rest: Bed,
};

interface WorkoutTypePickerProps {
  value: WorkoutType;
  onChange: (v: WorkoutType) => void;
}

export function WorkoutTypePicker({
  value,
  onChange,
}: WorkoutTypePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {WORKOUT_TYPES.map((w) => {
        const Icon = ICONS[w.value];
        const active = value === w.value;
        return (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium transition-all active:scale-95",
              active
                ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/20"
                : "border-border bg-card text-foreground hover:border-primary/40",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{w.label}</span>
          </button>
        );
      })}
    </div>
  );
}
