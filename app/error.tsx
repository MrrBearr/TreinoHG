"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Root client error boundary. Catches errors thrown anywhere below the root
 * layout (server or client) and shows a friendly fallback so the app never
 * white-screens.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Always log so dev console shows the cause.
    console.error("[app/error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <Card className="w-full max-w-md p-6 text-center space-y-4 animate-fade-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-xl font-bold tracking-tight">
            Algo deu errado
          </h1>
          <p className="text-sm text-muted-foreground">
            Tivemos um problema ao carregar essa tela. Tente novamente em
            instantes.
          </p>
        </div>
        {isDev && (
          <pre className="max-h-40 overflow-auto rounded-xl bg-secondary p-3 text-left text-[11px] leading-snug text-muted-foreground">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" /> Tentar de novo
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">
              <Home className="h-4 w-4" /> Voltar ao início
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
