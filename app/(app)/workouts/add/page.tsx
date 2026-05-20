import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { AddWorkoutForm } from "@/components/workouts/AddWorkoutForm";
import { getProfile } from "@/lib/queries";

export const metadata = { title: "Adicionar treino · TreinoHG" };

export default async function AddWorkoutPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const profile = await getProfile();
  return (
    <PageContainer>
      <Header
        title="Novo treino"
        subtitle="Registre o que treinou"
        showBack
      />
      <AddWorkoutForm
        defaultDate={searchParams.date}
        userWeight={profile?.weight_kg ?? null}
      />
    </PageContainer>
  );
}
