import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  listExercisesForProfessional,
  listExerciseMuscleGroups,
  listExerciseEquipment,
} from "@/lib/training-v2/exercise-repository";
import type { ExerciseStatus } from "@/lib/training-v2/types";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { ExerciseLibraryView } from "@/components/consultancies/training-v2/exercise-library-view";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    muscle?: string;
    equipment?: string;
    page?: string;
  }>;
};

export default async function ConsultancyExercisesPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { tab = "TODOS", q, status, muscle, equipment, page } = await searchParams;

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

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

  const validStatus: ExerciseStatus | undefined =
    status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED"
      ? (status as ExerciseStatus)
      : undefined;

  const parsedPage = Number(page);
  const currentPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  // Determine repository scope filter based on selected tab
  let repoScope: "ALL" | "GLOBAL" | "CONSULTANCY" = "ALL";
  if (tab === "TREVO_ONE") {
    repoScope = "GLOBAL";
  } else if (tab === "CONSULTORIA" || tab === "MEUS") {
    repoScope = "CONSULTANCY";
  }

  const [result, availableMuscles, availableEquipments] = await Promise.all([
    listExercisesForProfessional(ctx, {
      scope: repoScope,
      status: validStatus,
      query: q || undefined,
      muscleGroup: muscle && muscle !== "Todos os Músculos" ? muscle : undefined,
      equipment: equipment && equipment !== "Todos os Equipamentos" ? equipment : undefined,
      page: currentPage,
      pageSize: 25,
    }),
    listExerciseMuscleGroups(ctx),
    listExerciseEquipment(ctx),
  ]);

  // Filter items specifically for the tab semantics if needed
  let displayItems = result.items;
  if (tab === "CONSULTORIA") {
    displayItems = displayItems.filter(
      (i) => i.scope === "CONSULTANCY" && i.visibility === "CONSULTANCY"
    );
  } else if (tab === "MEUS") {
    displayItems = displayItems.filter(
      (i) => i.scope === "CONSULTANCY" && i.visibility === "CREATOR_ONLY"
    );
  }

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      viewModeState={effectiveState}
      themeVariant="dark-overview"
      showDashboardWallpaper={true}
      maxWidth="default"
    >
      <ExerciseLibraryView
        slug={slug}
        initialItems={displayItems}
        initialTotal={result.total}
        initialPage={currentPage}
        initialTotalPages={result.totalPages}
        availableMuscles={availableMuscles}
        availableEquipments={availableEquipments}
        currentTab={tab}
        currentQuery={q}
        currentMuscle={muscle}
        currentEquipment={equipment}
        canCreate={ctx.canAuthorTraining}
        canManageConsultancy={ctx.canManageConsultancy}
      />
    </ConsultancyAppShell>
  );
}
