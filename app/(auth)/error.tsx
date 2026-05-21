"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AuthErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[(auth)/error]", error);
  }, [error]);

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="space-y-3 p-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-warning/15 text-warning">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-display text-lg font-bold">
          Erro nessa tela
        </h1>
        <p className="text-sm text-muted-foreground">
          Tente novamente ou volte para o login.
        </p>
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" /> Tentar de novo
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Voltar para login</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
