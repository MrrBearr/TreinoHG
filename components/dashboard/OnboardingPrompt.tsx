import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function OnboardingPrompt() {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card">
      <div className="flex items-start gap-4 p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Target className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold leading-tight">
            Configure seus objetivos
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Calcule sua meta de calorias e macros para insights mais precisos.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/profile">
              Completar perfil <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
