import { Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MotivationCard({ phrase }: { phrase: string }) {
  return (
    <Card className="relative overflow-hidden border-primary/20">
      {/* Ambient glow */}
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-primary/8 blur-2xl" />
      <div className="relative flex items-start gap-3 p-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Zap className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            Frase do dia
          </p>
          <p className="text-sm font-semibold leading-relaxed text-foreground">
            {phrase}
          </p>
        </div>
      </div>
    </Card>
  );
}
