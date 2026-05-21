"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { Header } from "@/components/layout/Header";

/**
 * Error boundary scoped to the (app) route group. Keeps the bottom-nav shell
 * visible so the user can navigate elsewhere instead of being stranded.
 */
export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[(app)/error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <PageContainer>
      <Header title="Erro" subtitle="Não conseguimos carregar essa tela" />
      <Card className="space-y-4 p-5 animate-fade-in">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display font-semibold">Algo travou aqui</h2>
            <p className="text-sm text-muted-foreground">
              Uma falha aconteceu ao carregar essa tela. Tente novamente — se
              continuar, volte para o início.
            </p>
          </div>
        </div>
        {isDev && (
          <pre className="max-h-40 overflow-auto rounded-xl bg-secondary p-3 text-[11px] leading-snug text-muted-foreground">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
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
    </PageContainer>
  );
}
