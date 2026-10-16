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

  const isPersonal = effectiveMode === "PERSONAL" && context.roles.includes("PERSONAL");
  const isNutritionist = effectiveMode === "NUTRITIONIST" && context.roles.includes("NUTRITIONIST");
  const isConsultancyAdmin =
    (effectiveMode === "ADMIN" || (effectiveMode as string) === "CONSULTANCY_ADMIN") &&
    context.roles.includes("CONSULTANCY_ADMIN");

  if (!isPersonal && !isNutritionist && !isConsultancyAdmin) {
    redirect(`/consultoria/${slug}`);
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
      maxWidth="full"
      className="!p-0 !pb-0 flex flex-col flex-1 h-[100dvh] lg:h-svh overflow-hidden"
    >
      <div className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden">
        <PersonalStudentList
          consultancySlug={slug}
          students={students}
          effectiveMode={effectiveMode}
          userRoles={context.roles}
          professionalName={session.fullName}
          initialStudentPublicId={initialStudentPublicId}
        />
      </div>
    </ConsultancyAppShell>
  );
}
