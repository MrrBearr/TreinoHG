"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getRedirectUrl } from "@/lib/site-url";

export function ResendConfirmation() {
  const supabase = createClient();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: getRedirectUrl("/auth/callback"),
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("E-mail enviado", {
        description: "Confira sua caixa de entrada nos próximos minutos.",
      });
    } catch (err) {
      toast.error("Não foi possível reenviar", {
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="border-success/30 bg-success/5 p-4 text-center">
        <p className="text-sm font-medium">
          Enviamos um novo link de confirmação.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          O link é válido por algumas horas. Verifique também a pasta de spam.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="resend-email">Reenviar confirmação</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="resend-email"
              type="email"
              autoComplete="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11"
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <Send /> Enviar novo link
        </Button>
      </form>
    </Card>
  );
}
