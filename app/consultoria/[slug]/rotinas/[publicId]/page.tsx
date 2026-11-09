import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getWorkoutWithSpecificVersion } from "@/lib/training-v2/workout-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { WorkoutBuilder } from "@/components/consultancies/training-v2/workout-builder";

type PageProps = {
  params: Promise<{
    slug: string;
    publicId: string;
  }>;
  searchParams: Promise<{
    version?: string;
    student?: string;
    from?: string;
  }>;
};

export default async function WorkoutEditorPage({ params, searchParams }: PageProps) {
  const { slug, publicId } = await params;
  const { version: requestedVersionPublicId, student, from } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isProfessional =
    context.roles.includes("PERSONAL") || context.roles.includes("CONSULTANCY_ADMIN");
  if (!isProfessional) {
    redirect(`/consultoria/${slug}`);
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx || !ctx.canAuthorTraining) {
    redirect(`/consultoria/${slug}`);
  }

  let result = null;
  try {
    result = await getWorkoutWithSpecificVersion(ctx, publicId, requestedVersionPublicId);
  } catch (err) {
    console.error("[WorkoutEditorPage] Erro ao carregar rotina no Builder:", err);
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

  if (!result || !result.version) {
    return (
      <ConsultancyAppShell
        consultancyName={context.consultancyName}
        consultancySlug={context.consultancySlug}
        consultancyLogoUrl={context.consultancyLogoUrl}
        roles={context.roles}
        viewModeState={effectiveState}
        userName={session.fullName}
        userEmail={session.email}
        userPublicId={session.userPublicId}
        hasProfilePhoto={session.hasProfilePhoto}
        profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
        themeVariant="trainer-refined"
        showDashboardWallpaper={true}
      >
        <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-2xl shadow-xs">
            !
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#102E23]">
            Ficha de treino não encontrada
          </h2>
          <p className="text-sm text-[#4A6356] leading-relaxed">
            O treino solicitado não existe, foi arquivado ou não está acessível nesta consultoria.
          </p>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/consultoria/${slug}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#102E23] text-white hover:bg-[#176B49] transition-all text-center min-h-[44px] inline-flex items-center justify-center shadow-xs"
            >
              Voltar ao Início
            </Link>
            <Link
              href={`/consultoria/${slug}/rotinas`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white border border-[#D8E4DA] text-[#102E23] hover:bg-[#F5F5F0] transition-all text-center min-h-[44px] inline-flex items-center justify-center shadow-xs"
            >
              Ver todos os treinos
            </Link>
          </div>
        </div>
      </ConsultancyAppShell>
    );
  }

  const { workout, version, isDraft, allVersions, assignedStudent } = result;
  const effectiveStudentPublicId = student || assignedStudent?.membershipPublicId;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      viewModeState={effectiveState}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      themeVariant="trainer-refined"
      showDashboardWallpaper={true}
      maxWidth="full"
    >
      <div className="w-full max-w-full min-w-0 mx-auto pb-12">
        <WorkoutBuilder
          key={version.publicId}
          consultancySlug={slug}
          workout={workout}
          initialVersion={version}
          isDraft={isDraft}
          allVersions={allVersions}
          isConsultancyAdmin={ctx.canManageConsultancy}
          initialStudentPublicId={effectiveStudentPublicId}
          from={from}
        />
      </div>
    </ConsultancyAppShell>
  );
}
