import { Quote } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MotivationCard({ phrase }: { phrase: string }) {
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative flex items-start gap-3 p-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Quote className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium leading-relaxed text-foreground">
          {phrase}
        </p>
      </div>
    </Card>
  );
}
