"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  TrendingUp,
  Sparkles,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/history", label: "Histórico", icon: Calendar },
  { href: "/progress", label: "Progresso", icon: TrendingUp },
  { href: "/insights", label: "IA", icon: Sparkles },
  { href: "/profile", label: "Perfil", icon: User2 },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-xl items-stretch justify-between px-2 safe-bottom pt-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute -top-px h-1 w-8 rounded-full bg-primary animate-scale-in" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active ? "scale-110" : "",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
