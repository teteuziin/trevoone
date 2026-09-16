import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  listStudentWorkoutCards,
  type StudentWorkoutCardDto,
} from "@/lib/training-v2/assignment-repository";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {
    // Ignore fallback
  }
  return dateStr;
}

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

  // 1. Busca prescrições Training V2 para o aluno (autoridade exclusiva V2)
  const ctx = await resolveTrainingAccessContext(slug);
  let v2Assignments: StudentWorkoutCardDto[] = [];
  if (ctx && ctx.isStudent) {
    try {
      v2Assignments = await listStudentWorkoutCards(ctx);
    } catch {
      v2Assignments = [];
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
    >
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-16">
        {/* Back Link */}
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${access.context.consultancySlug}`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Estado vazio quando não há prescrição Training V2 ativa */}
        {!hasAnyTraining ? (
          <div className="space-y-6">
            <PageHeader
              title="Seus Treinos"
              description="Acompanhe suas rotinas de treino personalizadas prescritas pelo seu treinador."
            />
            <EmptyState
              title="Seu treino ainda não foi disponibilizado"
              description="Assim que seu Treinador liberar e ativar sua nova ficha de treino, ela aparecerá aqui com todos os exercícios, vídeos e orientações."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <PageHeader
              title="Meus Treinos"
              description="Suas rotinas de treino personalizadas prescritas pelo seu treinador."
            />

            {v2Assignments.length === 1 ? (
              /* Composição Heroica para 1 Treino Ativo */
              (() => {
                const assignment = v2Assignments[0];
                return (
                  <div className="p-6 sm:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] shadow-xs hover:border-[var(--brand)] transition-all space-y-6 border-specular-t depth-surface">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-2xs">
                            Ficha Ativa · v{assignment.versionNumber}
                          </span>
                          {assignment.difficultyLevel && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                              Nível {assignment.difficultyLevel === "BEGINNER"
                                ? "Iniciante"
                                : assignment.difficultyLevel === "ADVANCED"
                                ? "Avançado"
                                : "Intermediário"}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            {assignment.workoutTitle}
                          </h2>
                          {assignment.subtitle && (
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                              {assignment.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pt-1 sm:pt-0">
                        <Link
                          href={`/consultoria/${slug}/treinos/${assignment.assignmentPublicId}`}
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-xs transition-all min-h-[48px] depth-interactive cursor-pointer"
                        >
                          Acessar treino →
                        </Link>
                      </div>
                    </div>

                    {assignment.objective && (
                      <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Objetivo da Ficha
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                          {assignment.objective}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] shadow-2xs">
                        {assignment.blockCount} {assignment.blockCount === 1 ? "bloco de treino" : "blocos de treino"}
                      </span>
                      {assignment.estimatedDurationMinutes && (
                        <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] shadow-2xs tabular-nums">
                          ⏱ {assignment.estimatedDurationMinutes} min estimados
                        </span>
                      )}
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        Início: {formatDate(assignment.startsOn)}
                      </span>
                      {assignment.endsOn && (
                        <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                          Término: {formatDate(assignment.endsOn)}
                        </span>
                      )}
                    </div>

                    {assignment.notesForStudent && (
                      <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] space-y-1.5">
                        <p className="font-semibold text-[var(--brand)]">
                          Orientações do seu treinador:
                        </p>
                        <p className="text-[var(--text-secondary)] italic leading-relaxed">
                          &ldquo;{assignment.notesForStudent}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* Lista Responsiva para Múltiplos Treinos */
              <div className="space-y-4">
                {v2Assignments.map((assignment) => (
                  <div
                    key={assignment.assignmentPublicId}
                    className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--border-strong)] transition-all space-y-4 depth-surface"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-2xs">
                            Versão {assignment.versionNumber}
                          </span>
                          {assignment.difficultyLevel && (
                            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                              {assignment.difficultyLevel === "BEGINNER"
                                ? "Iniciante"
                                : assignment.difficultyLevel === "ADVANCED"
                                ? "Avançado"
                                : "Intermediário"}
                            </span>
                          )}
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-1">
                          {assignment.workoutTitle}
                        </h2>
                        {assignment.subtitle && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {assignment.subtitle}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/consultoria/${slug}/treinos/${assignment.assignmentPublicId}`}
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-xs transition-all shrink-0 min-h-[44px] depth-interactive cursor-pointer"
                      >
                        Acessar treino →
                      </Link>
                    </div>

                    {assignment.objective && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        <span className="font-semibold text-[var(--text-primary)]">Objetivo: </span>
                        {assignment.objective}
                      </p>
                    )}

                    {assignment.notesForStudent && (
                      <p className="text-xs text-[var(--text-secondary)] italic pt-2 border-t border-[var(--border-subtle)] leading-relaxed">
                        &ldquo;{assignment.notesForStudent}&rdquo;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {assignment.blockCount} {assignment.blockCount === 1 ? "bloco" : "blocos"}
                      </span>
                      {assignment.estimatedDurationMinutes && (
                        <span className="tabular-nums">· {assignment.estimatedDurationMinutes} min</span>
                      )}
                      <span>· Início: {formatDate(assignment.startsOn)}</span>
                      {assignment.endsOn && <span>· Término: {formatDate(assignment.endsOn)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
