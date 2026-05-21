"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Root error boundary. Catches any uncaught error in the app tree and
 * shows a friendly fallback instead of a white screen.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10 bg-background">
      <Card className="w-full max-w-md p-6 text-center space-y-4 animate-fade-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-bold">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          Um erro inesperado aconteceu. Tente recarregar a página.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="max-h-32 overflow-auto rounded-xl bg-secondary p-3 text-left text-[11px] text-muted-foreground">
            {error.message}
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
