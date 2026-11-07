import React from "react";
import { notFound, redirect } from "next/navigation";
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
  }>;
};

export default async function WorkoutEditorPage({ params, searchParams }: PageProps) {
  const { slug, publicId } = await params;
  const { version: requestedVersionPublicId, student } = await searchParams;

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

  let result;
  try {
    result = await getWorkoutWithSpecificVersion(ctx, publicId, requestedVersionPublicId);
  } catch (err) {
    console.error("[WorkoutEditorPage] Erro ao carregar rotina no Builder:", err);
    // If forbidden or version mismatch (e.g. forged version id or other personal's workout)
    redirect(`/consultoria/${slug}/rotinas`);
  }

  if (!result || !result.version) {
    notFound();
  }

  const { workout, version, isDraft, allVersions } = result;

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

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
      showDashboardWallpaper={false}
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
          initialStudentPublicId={student}
        />
      </div>
    </ConsultancyAppShell>
  );
}
