"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      themes={["light", "dark", "premium"]}
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
      <Toaster />
    </NextThemesProvider>
  );
}
