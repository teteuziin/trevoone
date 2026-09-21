import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentEvolutionHubData,
  getEvolutionComparisonBetweenDates,
} from "@/lib/consultancies/evolution";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Evolution360Hub } from "@/components/consultancies/evolution/evolution-360-hub";

interface PageProps {
  params: Promise<{
    slug: string;
    studentPublicId: string;
  }>;
}

export default async function ProfessionalStudentProgressDetailPage({
  params,
}: PageProps) {
  const { slug, studentPublicId } = await params;

  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");
  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  if (!isPersonal && !isNutritionist && !isConsultancyAdmin) {
    redirect(`/consultoria/${slug}`);
  }

  // 1. Fetch unified 360 data under strict operational relationship verification
  const hubData = await getStudentEvolutionHubData({
    userId: session.userId,
    consultancySlug: slug,
    studentPublicId,
  });

  if (!hubData) {
    notFound();
  }

  // 2. Compute initial comparison deltas in memory from pre-loaded hub data (0 extra DB queries)
  const initialComparisonData = await getEvolutionComparisonBetweenDates({
    userId: session.userId,
    consultancySlug: slug,
    studentPublicId,
    hubData,
  });

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          eyebrow="Acompanhamento 360°"
          title={`Evolução de ${hubData.student.fullName}`}
          description={hubData.student.email}
          backHref={`/consultoria/${slug}/progresso/alunos`}
          backLabel="Voltar para lista de alunos"
        />

        {/* Unified 360 Hub */}
        <Evolution360Hub
          consultancySlug={slug}
          hubData={hubData}
          initialComparisonData={initialComparisonData}
          isStudent={false}
          isPersonal={isPersonal}
          isNutritionist={isNutritionist}
          isAdmin={isConsultancyAdmin}
          studentPublicId={studentPublicId}
        />
      </div>
    </ConsultancyAppShell>
  );
}
