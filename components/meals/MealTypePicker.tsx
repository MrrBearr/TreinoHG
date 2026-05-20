"use client";

import { cn } from "@/lib/utils";
import { MEAL_TYPES, type MealType } from "@/lib/constants";

interface MealTypePickerProps {
  value: MealType;
  onChange: (v: MealType) => void;
}

export function MealTypePicker({ value, onChange }: MealTypePickerProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
      <div className="flex gap-2 pb-1">
        {MEAL_TYPES.map((m) => {
          const active = value === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
