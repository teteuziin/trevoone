import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getActiveTrainingPlanForStudent } from "@/lib/consultancies/training";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  listStudentWorkoutCards,
  type StudentWorkoutCardDto,
} from "@/lib/training-v2/assignment-repository";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { StudentTrainingPlan } from "@/components/consultancies/student-training-plan";
import { TrainingOfflineSync } from "@/components/offline/training-offline-sync";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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

  // 1. Busca prescrições Training V2 para o aluno
  const ctx = await resolveTrainingAccessContext(slug);
  let v2Assignments: StudentWorkoutCardDto[] = [];
  if (ctx && ctx.isStudent) {
    try {
      v2Assignments = await listStudentWorkoutCards(ctx);
    } catch {
      v2Assignments = [];
    }
  }

  // 2. Busca plano de treino Training V1 ACTIVE do aluno
  const activePlan = await getActiveTrainingPlanForStudent(session.userId, slug);

  const hasAnyTraining = v2Assignments.length > 0 || Boolean(activePlan);

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={access.context.consultancySlug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-16">
        {/* Silent Training Offline Auto-Sync Bridge (V1) */}
        {activePlan && (
          <TrainingOfflineSync
            userPublicId={session.userPublicId}
            userName={session.fullName}
            consultancyPublicId={access.context.consultancyPublicId}
            consultancyName={access.context.consultancyName}
            consultancySlug={access.context.consultancySlug}
            consultancyLogoUrl={access.context.consultancyLogoUrl}
            plan={activePlan}
          />
        )}

        {/* Back Link */}
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${access.context.consultancySlug}`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Estado vazio quando não há nem V1 nem V2 */}
        {!hasAnyTraining ? (
          <div className="space-y-6">
            <PageHeader
              title="Seu Treino"
              description="Acompanhe sua prescrição atual, exercícios e orientações do seu Personal."
            />
            <EmptyState
              title="Seu treino ainda não foi disponibilizado"
              description="Assim que seu Personal Trainer liberar e ativar sua nova ficha de treino, ela aparecerá aqui com todos os exercícios, vídeos e orientações."
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Training V2 Assignments: "Meus Treinos" */}
            {v2Assignments.length > 0 && (
              <div className="space-y-4">
                <PageHeader
                  title="Meus Treinos"
                  description="Suas rotinas de treino personalizadas prescritas pelo seu treinador."
                />

                <div className="space-y-3">
                  {v2Assignments.map((assignment) => (
                    <div
                      key={assignment.assignmentPublicId}
                      className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--border-hover)] transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                              Versão {assignment.versionNumber}
                            </span>
                            {assignment.difficultyLevel && (
                              <span className="text-[11px] font-medium text-[var(--foreground-muted)]">
                                {assignment.difficultyLevel === "BEGINNER"
                                  ? "Iniciante"
                                  : assignment.difficultyLevel === "ADVANCED"
                                  ? "Avançado"
                                  : "Intermediário"}
                              </span>
                            )}
                          </div>
                          <h2 className="text-base font-bold text-[var(--foreground)] mt-1">
                            {assignment.workoutTitle}
                          </h2>
                          {assignment.subtitle && (
                            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                              {assignment.subtitle}
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/consultoria/${slug}/treinos/${assignment.assignmentPublicId}`}
                          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-colors shrink-0"
                        >
                          Ver treino →
                        </Link>
                      </div>

                      {assignment.notesForStudent && (
                        <p className="text-xs text-[var(--foreground-muted)] italic pt-1 border-t border-[var(--border-subtle)]">
                          &ldquo;{assignment.notesForStudent}&rdquo;
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--foreground-muted)] pt-2 border-t border-[var(--border-subtle)]">
                        <span className="font-medium">
                          {assignment.blockCount} {assignment.blockCount === 1 ? "bloco" : "blocos"}
                        </span>
                        {assignment.estimatedDurationMinutes && (
                          <span>· {assignment.estimatedDurationMinutes} min</span>
                        )}
                        <span>· Início: {assignment.startsOn}</span>
                        {assignment.endsOn && <span>· Término: {assignment.endsOn}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Training V1 Plan Section (preserves 100% backward compatibility) */}
            {activePlan && (
              <div className="space-y-4">
                {v2Assignments.length > 0 && (
                  <div className="pt-4 border-t border-[var(--border-default)]">
                    <h2 className="text-base font-bold text-[var(--foreground)] mb-1">
                      Ficha de Treino Convencional
                    </h2>
                    <p className="text-xs text-[var(--foreground-muted)] mb-4">
                      Plano de treino tradicional mantido na sua consultoria.
                    </p>
                  </div>
                )}
                <StudentTrainingPlan
                  consultancySlug={access.context.consultancySlug}
                  consultancyName={access.context.consultancyName}
                  consultancyLogoUrl={access.context.consultancyLogoUrl}
                  plan={activePlan}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
