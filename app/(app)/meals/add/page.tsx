import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { AddMealForm } from "@/components/meals/AddMealForm";
import type { MealType } from "@/lib/constants";

export const metadata = { title: "Adicionar refeição · TreinoHG" };

export default function AddMealPage({
  searchParams,
}: {
  searchParams: { date?: string; type?: string };
}) {
  return (
    <PageContainer>
      <Header title="Nova refeição" subtitle="Registre o que comeu" showBack />
      <AddMealForm
        defaultDate={searchParams.date}
        defaultMealType={(searchParams.type as MealType) || undefined}
      />
    </PageContainer>
  );
}
