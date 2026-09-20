import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import {
  getStudentEvolutionHubData,
  getEvolutionComparisonBetweenDates,
} from "@/lib/consultancies/evolution";
import {
  getStudentPhotoEvaluationsData,
  getPhotoEvaluationComparisonData,
} from "@/lib/consultancies/photo-evaluations";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Evolution360Hub } from "@/components/consultancies/evolution/evolution-360-hub";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StudentProgressPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/progresso`);
  }

  const access = await resolveStudentModuleAccess(session.userId, slug);

  if (!access.allowed || !access.context) {
    if (access.reason === "FINANCIALLY_RESTRICTED") {
      redirect(`/consultoria/${slug}/pagamentos/regularizar`);
    }
    if (access.reason === "ONBOARDING_INCOMPLETE") {
      redirect(`/consultoria/${slug}/onboarding`);
    }
    // If not a student, redirect to overview or professional students list
    if (access.reason === "NOT_STUDENT") {
      redirect(`/consultoria/${slug}`);
    }
    redirect(`/consultoria/${slug}`);
  }

  // Fetch unified 360 evolution data in parallel
  const [hubData, initialComparisonData, photoData, comparisonData] = await Promise.all([
    getStudentEvolutionHubData({
      userId: session.userId,
      consultancySlug: slug,
    }),
    getEvolutionComparisonBetweenDates({
      userId: session.userId,
      consultancySlug: slug,
    }),
    getStudentPhotoEvaluationsData({
      userId: session.userId,
      consultancySlug: slug,
    }),
    getPhotoEvaluationComparisonData({
      userId: session.userId,
      consultancySlug: slug,
    }),
  ]);

  if (!hubData) {
    redirect(`/consultoria/${slug}`);
  }

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      consultancyPublicId={access.context.consultancyPublicId}
      activeRole="STUDENT"
    >
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          title="Evolução 360°"
          description="Acompanhe sua linha do tempo completa: peso, medidas corporais, fotos padronizadas e gráficos de evolução."
          backHref={`/consultoria/${slug}`}
          backLabel="Voltar à visão geral"
        />

        {/* Unified 360 Hub */}
        <Evolution360Hub
          consultancySlug={slug}
          hubData={hubData}
          initialComparisonData={initialComparisonData}
          isStudent={true}
          userPublicId={session.userPublicId}
          consultancyPublicId={access.context.consultancyPublicId}
          role="STUDENT"
          rawPhotoData={{
            activeRequest: photoData?.activeRequest || null,
            history: photoData?.history || [],
            comparisonData,
          }}
        />
      </div>
    </ConsultancyAppShell>
  );
}
