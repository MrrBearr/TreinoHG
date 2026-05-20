import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProgressCharts } from "@/components/progress/ProgressCharts";
import { getProfile, getRecentDays } from "@/lib/queries";

export const metadata = { title: "Progresso · TreinoHG" };

export default async function ProgressPage() {
  const [profile, days] = await Promise.all([getProfile(), getRecentDays(30)]);
  const target = profile?.calorie_target ?? 2000;
  return (
    <PageContainer>
      <Header
        title="Progresso"
        subtitle="Suas tendências e médias"
      />
      <div className="animate-fade-in">
        <ProgressCharts days={days} target={target} />
      </div>
    </PageContainer>
  );
}
