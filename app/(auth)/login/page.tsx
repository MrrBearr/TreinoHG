import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const metadata = { title: "Entrar · TreinoHG" };

export default function LoginPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30">
          <span className="font-display text-2xl font-black">T</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link
          href="/signup"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
