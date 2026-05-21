import Link from "next/link";
import { AlertTriangle, MailWarning, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResendConfirmation } from "@/components/auth/ResendConfirmation";

export const metadata = { title: "Erro de verificação · TreinoHG" };

interface PageProps {
  searchParams: {
    error?: string;
    error_code?: string;
    error_description?: string;
  };
}

export default function AuthErrorPage({ searchParams }: PageProps) {
  const code = searchParams.error_code ?? searchParams.error ?? "unknown";
  const description = (searchParams.error_description ?? "").replace(
    /\+/g,
    " ",
  );

  const meta = describe(code, description);

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="space-y-3 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning shadow-lg shadow-warning/10">
          <meta.Icon className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {meta.title}
        </h1>
        <p className="text-sm text-muted-foreground">{meta.message}</p>
        {description && description !== meta.message && (
          <p className="break-words text-xs text-muted-foreground/70">
            {description}
          </p>
        )}
      </div>

      {meta.canResend && <ResendConfirmation />}

      <div className="space-y-2">
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/login">Voltar para login</Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="w-full">
          <Link href="/signup">Criar nova conta</Link>
        </Button>
      </div>
    </div>
  );
}

function describe(code: string, _description: string) {
  switch (code) {
    case "otp_expired":
    case "access_denied":
      return {
        Icon: MailWarning,
        title: "Link expirado",
        message:
          "O link de confirmação venceu ou já foi usado. Solicite um novo abaixo.",
        canResend: true,
      };
    case "missing_code":
      return {
        Icon: ShieldAlert,
        title: "Link incompleto",
        message:
          "Esse link parece incompleto. Tente clicar de novo no e-mail ou solicite um novo.",
        canResend: true,
      };
    case "exchange_failed":
      return {
        Icon: ShieldAlert,
        title: "Não foi possível confirmar",
        message:
          "Tivemos um problema ao validar sua sessão. Tente fazer login novamente.",
        canResend: true,
      };
    default:
      return {
        Icon: AlertTriangle,
        title: "Algo deu errado",
        message:
          "Não conseguimos completar a verificação. Tente novamente ou entre em contato.",
        canResend: true,
      };
  }
}
