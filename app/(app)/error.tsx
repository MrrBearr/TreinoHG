"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";

/**
 * Error boundary for the (app) route group.
 * The bottom nav stays visible so the user can navigate elsewhere.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[(app)/error]", error);
  }, [error]);

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center gap-5 py-20 animate-fade-in">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <Card className="w-full max-w-sm p-5 text-center space-y-3">
          <h2 className="font-display text-lg font-bold">Erro nessa tela</h2>
          <p className="text-sm text-muted-foreground">
            Tivemos um problema ao carregar. Tente novamente.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="max-h-28 overflow-auto rounded-xl bg-secondary p-3 text-left text-[10px] text-muted-foreground">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <Button size="lg" className="flex-1" onClick={() => reset()}>
              <RefreshCw className="h-4 w-4" /> Tentar de novo
            </Button>
            <Button asChild size="lg" variant="outline" className="flex-1">
              <Link href="/dashboard">
                <Home className="h-4 w-4" /> Início
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
