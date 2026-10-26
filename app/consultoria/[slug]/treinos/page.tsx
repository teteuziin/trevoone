import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  resolveStudentDailyWorkout,
  type DailyWorkoutResolution,
} from "@/lib/training-v2/daily-workout-resolver";
import {
  listStudentWorkoutCards,
  type StudentWorkoutCardDto,
} from "@/lib/training-v2/assignment-repository";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentTreinosClientView } from "@/components/consultancies/training-v2/student-treinos-client-view";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentTreinosPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const access = await resolveStudentModuleAccess(session.userId, slug);

  if (access.reason === "UNAUTHENTICATED") {
    redirect("/login");
  }

  if (access.reason === "INVALID_CONTEXT" || !access.context) {
    redirect("/selecionar-consultoria");
  }

  if (access.reason === "NOT_STUDENT") {
    redirect(`/consultoria/${access.context.consultancySlug}`);
  }

  if (access.reason === "FINANCIALLY_RESTRICTED") {
    redirect(`/consultoria/${access.context.consultancySlug}/pagamentos/regularizar`);
  }

  // Se onboarding incompleto, exibe painel com pendências
  if (!access.allowed) {
    return (
      <ConsultancyAppShell
        consultancyName={access.context.consultancyName}
        consultancySlug={access.context.consultancySlug}
        consultancyLogoUrl={access.context.consultancyLogoUrl}
        roles={access.context.roles}
        userName={session.fullName}
        userEmail={session.email}
        userPublicId={session.userPublicId}
        hasProfilePhoto={session.hasProfilePhoto}
        profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
        consultancyPublicId={access.context.consultancyPublicId}
        activeRole="STUDENT"
        showDashboardWallpaper={true}
        themeVariant="dark-overview"
      >
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <StudentModuleAccessPanel
            moduleType="TRAINING"
            consultancySlug={access.context.consultancySlug}
            consultancyName={access.context.consultancyName}
            allowed={access.allowed}
            confirmedRequirements={access.confirmedRequirements}
            totalRequirements={access.totalRequirements}
          />
        </div>
      </ConsultancyAppShell>
    );
  }

  // 1. Busca prescrições Training V2 para o aluno (autoridade exclusiva V2)
  const ctx = await resolveTrainingAccessContext(slug);
  let v2Assignments: StudentWorkoutCardDto[] = [];
  let dailyWorkout: DailyWorkoutResolution | null = null;
  if (ctx && ctx.isStudent) {
    try {
      [v2Assignments, dailyWorkout] = await Promise.all([
        listStudentWorkoutCards(ctx).catch(() => []),
        resolveStudentDailyWorkout(ctx, {
          consultancyTimezone: access.context.consultancyTimezone,
          consultancySlug: slug,
        }).catch(() => null),
      ]);
    } catch {
      v2Assignments = [];
      dailyWorkout = null;
    }
  }

  const hasAnyTraining = v2Assignments.length > 0;

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={access.context.consultancySlug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={access.context.consultancyPublicId}
      activeRole="STUDENT"
      showDashboardWallpaper={true}
      themeVariant="dark-overview"
    >
      {!hasAnyTraining ? (
        <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 overflow-x-hidden">
          <div className="flex items-center justify-between">
            <Link
              href={`/consultoria/${access.context.consultancySlug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-subtle)] transition-all min-h-[44px]"
            >
              ← Voltar ao painel
            </Link>
            <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              {access.context.consultancyName}
            </span>
          </div>
          <div className="relative rounded-3xl overflow-hidden border border-[var(--border-default)] p-8 sm:p-12 text-center bg-[var(--surface)] depth-surface">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight font-heading">
              Seus Treinos
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              Assim que seu treinador liberar e ativar sua ficha de treinamento, ela estará disponível aqui com séries, repetições, intervalos e histórico.
            </p>
          </div>
          <EmptyState
            title="Aguardando liberação do treinador"
            description="Sua equipe técnica está estruturando o seu plano de treino ideal."
          />
        </div>
      ) : (
        <StudentTreinosClientView
          consultancySlug={slug}
          consultancyName={access.context.consultancyName}
          dailyWorkout={dailyWorkout}
          assignments={v2Assignments}
        />
      )}
    </ConsultancyAppShell>
  );
}
