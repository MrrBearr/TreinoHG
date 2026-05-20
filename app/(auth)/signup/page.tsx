import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = { title: "Criar conta · TreinoHG" };

export default function SignupPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30">
          <span className="font-display text-2xl font-black">T</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Criar conta
        </h1>
        <p className="text-sm text-muted-foreground">
          Comece a registrar suas calorias e treinos hoje.
        </p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
