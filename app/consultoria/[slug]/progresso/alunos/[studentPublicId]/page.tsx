import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getPersonalStudentDetail } from "@/lib/consultancies/personal-student-hub";
import {
  getStudentEvolutionHubData,
  getEvolutionComparisonBetweenDates,
} from "@/lib/consultancies/evolution";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Evolution360Hub } from "@/components/consultancies/evolution/evolution-360-hub";
import { PersonalStudentDetailView } from "@/components/consultancies/personal-student-hub/personal-student-detail-view";

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

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const { effectiveMode } = effectiveState;

  if (effectiveMode === "STUDENT" || effectiveMode === "INFLUENCER") {
    redirect(`/consultoria/${slug}/progresso`);
  }

  const isPersonal = effectiveMode === "PERSONAL" && context.roles.includes("PERSONAL");
  const isNutritionist = effectiveMode === "NUTRITIONIST" && context.roles.includes("NUTRITIONIST");
  const isConsultancyAdmin =
    (effectiveMode === "ADMIN" || (effectiveMode as string) === "CONSULTANCY_ADMIN") &&
    context.roles.includes("CONSULTANCY_ADMIN");

  if (!isPersonal && !isNutritionist && !isConsultancyAdmin) {
    redirect(`/consultoria/${slug}`);
  }

  // Load complete student hub detail for Personal and Consultancy Admin
  if (isPersonal || isConsultancyAdmin) {
    const detail = await getPersonalStudentDetail({
      consultancyId: context.consultancyId,
      consultancySlug: slug,
      studentMembershipPublicId: studentPublicId,
    });

    if (!detail) {
      notFound();
    }

    return (
      <ConsultancyAppShell
        consultancyName={context.consultancyName}
        consultancySlug={slug}
        consultancyLogoUrl={context.consultancyLogoUrl}
        roles={context.roles}
        userName={session.fullName}
        userEmail={session.email}
        userPublicId={session.userPublicId}
        consultancyPublicId={context.consultancyPublicId}
        viewModeState={effectiveState}
      >
        <PersonalStudentDetailView
          consultancySlug={slug}
          detail={detail}
        />
      </ConsultancyAppShell>
    );
  }

  // Nutritionist-only fallback: unified 360 evolution hub
  const hubData = await getStudentEvolutionHubData({
    userId: session.userId,
    consultancySlug: slug,
    studentPublicId,
    effectiveRole: effectiveMode,
  });

  if (!hubData) {
    notFound();
  }

  const initialComparisonData = await getEvolutionComparisonBetweenDates({
    userId: session.userId,
    consultancySlug: slug,
    studentPublicId,
    hubData,
    effectiveRole: effectiveMode,
  });

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      consultancyPublicId={context.consultancyPublicId}
      viewModeState={effectiveState}
    >
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        <PageHeader
          eyebrow="Acompanhamento 360�"
          title={`Evolu��o de ${hubData.student.fullName}`}
          description={hubData.student.email}
          backHref={`/consultoria/${slug}/progresso/alunos`}
          backLabel="Voltar para lista de alunos"
        />

        <Evolution360Hub
          consultancySlug={slug}
          hubData={hubData}
          initialComparisonData={initialComparisonData}
          isStudent={false}
          isPersonal={isPersonal}
          isNutritionist={isNutritionist}
          isAdmin={isConsultancyAdmin}
          studentPublicId={studentPublicId}
          userPublicId={session.userPublicId}
          consultancyPublicId={context.consultancyPublicId}
          role={effectiveMode}
        />
      </div>
    </ConsultancyAppShell>
  );
}
