import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { PhotoAnalyzer } from "@/components/meals/PhotoAnalyzer";

export const metadata = { title: "Analisar foto · TreinoHG" };

export default function AnalyzeMealPage() {
  return (
    <PageContainer>
      <Header
        title="Analisar refeição"
        subtitle="A IA identifica e estima as calorias"
        showBack
      />
      <PhotoAnalyzer />
    </PageContainer>
  );
}
