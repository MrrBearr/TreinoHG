"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showTheme?: boolean;
  right?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  subtitle,
  showBack,
  showTheme = true,
  right,
  className,
}: HeaderProps) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-4 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {showBack ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => router.back()}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <span className="text-sm font-black">T</span>
            </span>
            <span>TreinoHG</span>
          </Link>
        )}
        <div className="flex-1">
          {title && (
            <h1 className="font-display text-lg font-bold leading-none">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {right}
          {showTheme && <ThemeToggle />}
        </div>
      </div>
    </header>
  );
}
