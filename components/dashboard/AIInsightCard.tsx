"use client";

import * as React from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card className="relative overflow-hidden border-accent/20">
      {/* Ambient background */}
      <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute right-0 top-0 h-16 w-16 rounded-full bg-primary/8 blur-2xl" />

      <div className="relative p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground/90 text-background shadow-lg">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Coach IA
              </div>
              <div className="text-[11px] text-muted-foreground">
                Insight de hoje
              </div>
            </div>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={load}
            aria-label="Atualizar"
            disabled={loading}
            className="rounded-full"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            <div className="h-4 w-full rounded-lg shimmer" />
            <div className="h-4 w-4/5 rounded-lg shimmer" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            Não consegui gerar o insight agora. Tente novamente.
          </p>
        ) : (
          <p className="text-sm font-medium leading-relaxed animate-fade-in">
            {insight}
          </p>
        )}

        <Link
          href="/insights"
          className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Conversar com o coach
        </Link>
      </div>
    </Card>
  );
}
