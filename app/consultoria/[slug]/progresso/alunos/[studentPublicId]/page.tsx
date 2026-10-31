import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getPersonalStudentDetail } from "@/lib/consultancies/personal-student-hub";
import { evaluateStudentMonitoring } from "@/lib/monitoring/evaluator";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";
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
  searchParams?: Promise<{
    fromPage?: string;
    filter?: string;
    q?: string;
  }>;
}

export default async function ProfessionalStudentProgressDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, studentPublicId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const backQuery = new URLSearchParams();
  if (resolvedSearchParams?.fromPage) backQuery.set("page", resolvedSearchParams.fromPage);
  if (resolvedSearchParams?.filter) backQuery.set("filter", resolvedSearchParams.filter);
  if (resolvedSearchParams?.q) backQuery.set("q", resolvedSearchParams.q);
  const backQueryStr = backQuery.toString();
  const backHref = `/consultoria/${slug}/progresso/alunos${backQueryStr ? `?${backQueryStr}` : ""}`;

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

  const canAccessNutritionist =
    context.roles.includes("NUTRITIONIST") ||
    context.roles.includes("CONSULTANCY_ADMIN");

  const canAccessPersonal =
    context.roles.includes("PERSONAL") ||
    context.roles.includes("CONSULTANCY_ADMIN");

  const canAccessAdmin =
    context.roles.includes("CONSULTANCY_ADMIN");

  // Mode validation against permissions
  const hasAccessForCurrentMode =
    (effectiveMode === "NUTRITIONIST" && canAccessNutritionist) ||
    (effectiveMode === "PERSONAL" && canAccessPersonal) ||
    (effectiveMode === "ADMIN" && canAccessAdmin);

  if (!hasAccessForCurrentMode) {
    redirect(`/consultoria/${slug}`);
  }

  const isPersonal = effectiveMode === "PERSONAL";
  const isNutritionist = effectiveMode === "NUTRITIONIST";
  const isConsultancyAdmin = effectiveMode === "ADMIN";

  // Canonical unification: Operating in Nutritionist mode opens the complete clinical nutrition
  // record (Prontuário) directly. Multi-role users (Personal + Nutritionist or Admin + Nutritionist)
  // seamlessly open Prontuário whenever operating in Nutritionist mode, with NO restrictive !isPersonal block.
  if (effectiveMode === "NUTRITIONIST") {
    redirect(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
  }

  // Load complete student hub detail for Personal and Consultancy Admin
  if (isPersonal || isConsultancyAdmin) {
    const connection = await getDbConnection();
    let studentMemberId: number;
    let canonicalMembershipPublicId = studentPublicId;
    try {
      // Resolve student membership within this consultancy supporting both cm.public_id and u.public_id
      const [mRows] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.id, cm.public_id
         FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
         WHERE cm.consultancy_id = ?
           AND (cm.public_id = ? OR u.public_id = ?)
           AND cm.status = 'ACTIVE'
           AND u.deleted_at IS NULL
         LIMIT 1;`,
        [context.consultancyId, studentPublicId, studentPublicId]
      );
      if (!Array.isArray(mRows) || mRows.length === 0) {
        notFound();
      }
      studentMemberId = Number(mRows[0].id);
      canonicalMembershipPublicId = String(mRows[0].public_id);
    } finally {
      connection.release();
    }

    // If accessed via user public_id rather than canonical membership public_id, redirect to canonical URL
    if (canonicalMembershipPublicId !== studentPublicId) {
      const query = backQueryStr ? `?${backQueryStr}` : "";
      redirect(`/consultoria/${slug}/progresso/alunos/${canonicalMembershipPublicId}${query}`);
    }

    const detail = await getPersonalStudentDetail({
      consultancyId: context.consultancyId,
      consultancySlug: slug,
      studentMembershipPublicId: studentPublicId,
    });

    if (!detail) {
      notFound();
    }

    const studentMonitoring = await evaluateStudentMonitoring(context.consultancyId, studentMemberId).catch(() => null);

    return (
      <ConsultancyAppShell
        consultancyName={context.consultancyName}
        consultancySlug={slug}
        consultancyLogoUrl={context.consultancyLogoUrl}
        roles={context.roles}
        userName={session.fullName}
        userEmail={session.email}
        userPublicId={session.userPublicId}
        hasProfilePhoto={session.hasProfilePhoto}
        profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
        consultancyPublicId={context.consultancyPublicId}
        viewModeState={effectiveState}
        showDashboardWallpaper={true}
        themeVariant="dark-overview"
        maxWidth="default"
      >
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <PersonalStudentDetailView
            consultancySlug={slug}
            detail={detail}
            studentMonitoring={studentMonitoring}
            effectiveMode={effectiveMode}
            userRoles={context.roles}
            backHref={backHref}
          />
        </div>
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
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context.consultancyPublicId}
      viewModeState={effectiveState}
      showDashboardWallpaper={true}
      themeVariant="dark-overview"
      maxWidth="default"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <PageHeader
          eyebrow="Acompanhamento 360°"
          title={`Evolução de ${hubData.student.fullName}`}
          description={hubData.student.email}
          backHref={backHref}
          backLabel={isNutritionist ? "Voltar para lista de pacientes" : "Voltar aos alunos"}
        />

        <Evolution360Hub
          consultancySlug={slug}
          hubData={hubData}
          initialComparisonData={initialComparisonData}
          isStudent={false}
          isPersonal={isPersonal}
          isNutritionist={isNutritionist}
          isAdmin={isConsultancyAdmin}
          studentPublicId={hubData.student.publicId}
          userPublicId={session.userPublicId}
          consultancyPublicId={context.consultancyPublicId}
          role={effectiveMode}
        />
      </div>
    </ConsultancyAppShell>
  );
}
