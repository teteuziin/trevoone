import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getStudentWorkoutViewDetailed } from "@/lib/training-v2/assignment-repository";
import {
  getActiveOrLatestStudentWorkoutExecution,
  listStudentWorkoutExecutionHistory,
} from "@/lib/training-v2/execution-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { StudentWorkoutRenderer } from "@/components/consultancies/training-v2/student-workout-renderer";

type PageProps = {
  params: Promise<{
    slug: string;
    assignmentPublicId: string;
  }>;
  searchParams?: Promise<{
    bloco?: string;
    block?: string;
  }>;
};

export default async function StudentWorkoutDetailPage({ params, searchParams }: PageProps) {
  const { slug, assignmentPublicId } = await params;
  const search = searchParams ? await searchParams : undefined;
  const targetBlockPublicId = search?.bloco || search?.block || null;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    redirect(`/consultoria/${slug}`);
  }

  // Load through detailed polymorphic assignment authority
  const result = await getStudentWorkoutViewDetailed(ctx, assignmentPublicId, targetBlockPublicId);

  if (result.status === "NOT_FOUND") {
    notFound();
  }

  if (result.status === "ENDED") {
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
        consultancyPublicId={context.consultancyPublicId}
        activeRole="STUDENT"
      >
        <div className="space-y-4 max-w-xl mx-auto pb-12 pt-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-[var(--foreground)] mb-2">
              Treino não está mais ativo
            </h1>
            <p className="text-sm text-[var(--foreground-muted)] mb-6 leading-relaxed">
              {result.message}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {result.activeAssignmentPublicId && (
                <Link
                  href={`/consultoria/${slug}/treinos/${result.activeAssignmentPublicId}`}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors text-center"
                >
                  {result.activeWorkoutTitle ? `Acessar treino atual (${result.activeWorkoutTitle})` : "Acessar treino atual"}
                </Link>
              )}
              <Link
                href={`/consultoria/${slug}/treinos`}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] font-semibold text-sm transition-colors text-center"
              >
                Ver todos os meus treinos
              </Link>
              <Link
                href={`/consultoria/${slug}`}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors text-center flex items-center justify-center"
              >
                Voltar ao painel
              </Link>
            </div>
          </div>
        </div>
      </ConsultancyAppShell>
    );
  }

  const canonicalAssignmentId = result.resolvedAssignmentPublicId;
  const effectiveBlockId = targetBlockPublicId || result.activeBlockPublicId || null;

  // Load execution state & history for this canonical assignment
  const [initialExecution, executionHistory] = await Promise.all([
    getActiveOrLatestStudentWorkoutExecution(ctx, canonicalAssignmentId),
    listStudentWorkoutExecutionHistory(ctx, canonicalAssignmentId),
  ]);

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
      consultancyPublicId={context.consultancyPublicId}
      activeRole="STUDENT"
    >
      <div className="w-full max-w-6xl mx-auto pb-12 space-y-4">
        {/* Back Link */}
        <div>
          <Link
            href={`/consultoria/${slug}/treinos`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors min-h-[44px]"
          >
            ← Voltar aos meus treinos
          </Link>
        </div>

        {/* Workout Renderer with Execution State and History */}
        <StudentWorkoutRenderer
          workout={result.workoutView}
          initialExecution={initialExecution}
          initialHistory={executionHistory}
          consultancySlug={slug}
          userPublicId={session.userPublicId}
          consultancyPublicId={context.consultancyPublicId}
          role="STUDENT"
          initialSelectedBlockPublicId={effectiveBlockId}
        />
      </div>
    </ConsultancyAppShell>
  );
}
