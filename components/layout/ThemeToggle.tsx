"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "premium"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button size="icon-sm" variant="ghost" disabled aria-hidden />;
  }

  const cur = (theme as (typeof ORDER)[number]) ?? "dark";
  const idx = ORDER.indexOf(cur);
  const next = ORDER[(idx + 1) % ORDER.length];

  const Icon = cur === "light" ? Sun : cur === "premium" ? Sparkles : Moon;

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={`Mudar tema (atual: ${cur})`}
      onClick={() => setTheme(next)}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
