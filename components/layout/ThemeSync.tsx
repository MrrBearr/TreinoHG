"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/**
 * Syncs the persisted user theme (from DB profile) into next-themes
 * the first time the app loads. Local toggles via ThemeToggle still write
 * to localStorage and update the DB through updateTheme server action.
 */
export function ThemeSync({ theme }: { theme: string | null }) {
  const { setTheme, theme: current } = useTheme();
  const synced = React.useRef(false);
  React.useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    if (theme && theme !== current) {
      setTheme(theme);
    }
  }, [theme, current, setTheme]);
  return null;
}
