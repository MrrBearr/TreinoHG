"use client";

import * as React from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AIInsightCard({ date }: { date: string }) {
  const [insight, setInsight] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/ai/insight?date=${date}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("err");
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
    <Card className="relative overflow-hidden border-accent/30 bg-gradient-to-br from-accent/15 via-card to-card">
      <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
      <div className="relative p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Insight de hoje
              </div>
              <div className="text-xs text-muted-foreground">Coach IA</div>
            </div>
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
            Não consegui gerar o insight agora. Tente novamente em instantes.
          </p>
        ) : (
          <p className="text-sm font-medium leading-relaxed">{insight}</p>
        )}
        <Link
          href="/insights"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Conversar com o coach →
        </Link>
      </div>
    </Card>
  );
}
