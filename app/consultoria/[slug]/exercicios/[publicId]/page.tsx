import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getExerciseByIdOrPublicId } from "@/lib/training-v2/exercise-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { DuotoneExercisesIcon } from "@/components/ui/icons/duotone-icons";
import { ConsultancyExerciseForm } from "@/components/consultancies/training-v2/consultancy-exercise-form";

type PageProps = {
  params: Promise<{
    slug: string;
    publicId: string;
  }>;
};

export default async function ConsultancyExerciseDetailPage({ params }: PageProps) {
  const { slug, publicId } = await params;

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

  const exercise = await getExerciseByIdOrPublicId(ctx, { publicId });
  if (!exercise) {
    notFound();
  }

  const isGlobal = exercise.scope === "GLOBAL";
  let isTenantOwner = false;

  if (!isGlobal) {
    if (ctx.canManageConsultancy || exercise.visibility === "CREATOR_ONLY") {
      isTenantOwner = true;
    } else {
      const conn = await getDbConnection();
      try {
        const [rows] = await conn.execute<RowDataPacket[]>(
          `SELECT created_by_membership_id FROM exercises WHERE public_id = ? LIMIT 1;`,
          [publicId]
        );
        isTenantOwner = Boolean(
          rows && rows.length > 0 && ctx.membershipId && Number(rows[0].created_by_membership_id) === ctx.membershipId
        );
      } finally {
        conn.release();
      }
    }
  }

  // Determine view mode
  // If global: read-only view
  // If consultancy shared and not owner: read-only view
  // If owner or admin: edit mode
  const mode = isGlobal || !isTenantOwner ? "view" : "edit";
  const canEdit = isTenantOwner;

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

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
      <div className="w-full max-w-5xl mx-auto space-y-5 pb-16">
        {/* Compact Header */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151619] border border-neutral-200/80 dark:border-[#303238] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/consultoria/${slug}/exercicios`}
              className="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-95 border border-neutral-200 dark:border-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
              aria-label="Voltar para a biblioteca de exercícios"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>

            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <DuotoneExercisesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                {exercise.name}
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
                {exercise.muscleGroupPrimary} • {exercise.equipment}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {isGlobal ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                Oficial Trevo One
              </span>
            ) : exercise.visibility === "CONSULTANCY" ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                Minha Consultoria
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                Privado • Só para mim
              </span>
            )}
          </div>
        </div>

        <ConsultancyExerciseForm
          slug={slug}
          consultancyPublicId={context.consultancyPublicId}
          mode={mode}
          initialData={exercise}
          canEdit={canEdit}
        />
      </div>
    </ConsultancyAppShell>
  );
}
