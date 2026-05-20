"use client";

import * as React from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function DailyInsightBlock({ date }: { date: string }) {
  const [insight, setInsight] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/ai/insight?date=${date}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setInsight(json.insight ?? "");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Análise do dia</h3>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={load}
          aria-label="Atualizar"
          disabled={loading}
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">
          Falha ao gerar análise. Tente novamente.
        </p>
      ) : (
        <p className="text-sm leading-relaxed">{insight}</p>
      )}
    </Card>
  );
}
