import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { listPersonalStudents } from "@/lib/consultancies/personal-student-hub";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PersonalStudentList } from "@/components/consultancies/personal-student-hub/personal-student-list";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    student?: string;
    page?: string;
    filter?: string;
    q?: string;
  }>;
}

export default async function ProfessionalStudentsProgressListPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialStudentPublicId = resolvedSearchParams?.student;
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/progresso/alunos`);
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

  const hasAccessForCurrentMode =
    (effectiveMode === "NUTRITIONIST" && canAccessNutritionist) ||
    (effectiveMode === "PERSONAL" && canAccessPersonal) ||
    (effectiveMode === "ADMIN" && canAccessAdmin);

  if (!hasAccessForCurrentMode) {
    redirect(`/consultoria/${slug}`);
  }

  // Se um estudante específico foi requisitado por parâmetro, redireciona para a rota existente de perfil
  if (initialStudentPublicId) {
    redirect(`/consultoria/${slug}/progresso/alunos/${initialStudentPublicId}`);
  }

  const students = await listPersonalStudents({ consultancyId: context.consultancyId });

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
      themeVariant="dark-overview"
      showDashboardWallpaper={true}
      maxWidth="default"
    >
      <div className="w-full max-w-[1280px] mx-auto space-y-6">
        <PersonalStudentList
          consultancySlug={slug}
          students={students}
          effectiveMode={effectiveMode}
          userRoles={context.roles}
          professionalName={session.fullName}
          initialPage={resolvedSearchParams?.page ? Number(resolvedSearchParams.page) : 1}
          initialFilter={resolvedSearchParams?.filter || "all"}
          initialSearch={resolvedSearchParams?.q || ""}
        />
      </div>
    </ConsultancyAppShell>
  );
}
