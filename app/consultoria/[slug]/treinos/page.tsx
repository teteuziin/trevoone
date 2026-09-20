import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { DumbbellIcon as Dumbbell, ClockIcon as Clock } from "@/components/ui/icons";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  listStudentWorkoutCards,
  type StudentWorkoutCardDto,
} from "@/lib/training-v2/assignment-repository";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
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
        userPublicId={session.userPublicId}
        consultancyPublicId={access.context.consultancyPublicId}
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
  const primaryAssignment = v2Assignments[0] as StudentWorkoutCardDto | undefined;
  const secondaryAssignments = v2Assignments.slice(1);

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={access.context.consultancySlug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      consultancyPublicId={access.context.consultancyPublicId}
    >
      <div className="w-full max-w-4xl mx-auto space-y-8 pb-16 overflow-x-hidden">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/consultoria/${access.context.consultancySlug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-subtle)] transition-all"
          >
            ← Voltar ao painel
          </Link>
          <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
            {access.context.consultancyName}
          </span>
        </div>

        {/* Estado vazio quando não há prescrição Training V2 ativa */}
        {!hasAnyTraining ? (
          <div className="space-y-6">
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
          <div className="space-y-8">
            {/* PERFORMANCE HERO BANNER */}
            <div className="relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[260px] flex flex-col justify-end p-6 sm:p-8 border border-[var(--border-strong)] shadow-sm bg-neutral-950">
              <Image
                src="/images/student/workout-editorial.webp"
                alt=""
                aria-hidden="true"
                unoptimized
                fill
                priority
                className="object-cover object-center brightness-[0.42] scale-105 transition-transform duration-700 hover:scale-100"
              />
              {/* Cinematic Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent pointer-events-none" />

              {/* Hero Content */}
              <div className="relative z-10 space-y-2.5 max-w-2xl text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white/15 backdrop-blur-md border border-white/20 text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Performance & Treinamento
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-white/90">
                    {v2Assignments.length} {v2Assignments.length === 1 ? "rotina prescrita" : "rotinas prescritas"}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm font-heading">
                  Rotinas de Treino
                </h1>

                <p className="text-xs sm:text-sm text-neutral-200 font-normal leading-relaxed drop-shadow-xs max-w-xl">
                  Execução precisa, progressão contínua de cargas e registro em tempo real sincronizado com seu treinador.
                </p>
              </div>
            </div>

            {/* PRIMARY SPOTLIGHT WORKOUT CARD */}
            {primaryAssignment && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
                      Ficha Principal em Destaque
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Prescrição Atual
                  </span>
                </div>

                <div className="p-6 sm:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] shadow-xs hover:border-[var(--brand)] transition-all space-y-6 border-specular-t depth-surface">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-2xs">
                          Versão {primaryAssignment.versionNumber}
                        </span>
                        {primaryAssignment.difficultyLevel && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            Nível {primaryAssignment.difficultyLevel === "BEGINNER"
                              ? "Iniciante"
                              : primaryAssignment.difficultyLevel === "ADVANCED"
                                ? "Avançado"
                                : "Intermediário"}
                          </span>
                        )}
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                          {primaryAssignment.blockCount} {primaryAssignment.blockCount === 1 ? "bloco" : "blocos"} de exercícios
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
                          {primaryAssignment.workoutTitle}
                        </h3>
                        {primaryAssignment.subtitle && (
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                            {primaryAssignment.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 pt-1 sm:pt-0">
                      <Link
                        href={`/consultoria/${slug}/treinos/${primaryAssignment.assignmentPublicId}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-sm transition-all min-h-[48px] depth-interactive cursor-pointer"
                      >
                        Acessar treino completo →
                      </Link>
                    </div>
                  </div>

                  {/* Objective */}
                  {primaryAssignment.objective && (
                    <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Objetivo da Ficha
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                        {primaryAssignment.objective}
                      </p>
                    </div>
                  )}

                  {/* Metadata Chips Grid */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] shadow-2xs">
                      <Dumbbell className="w-3.5 h-3.5 text-[var(--brand)]" strokeWidth={1.75} />
                      {primaryAssignment.blockCount} {primaryAssignment.blockCount === 1 ? "bloco de treino" : "blocos de treino"}
                    </span>
                    {primaryAssignment.estimatedDurationMinutes && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] shadow-2xs tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" strokeWidth={1.75} />
                        {primaryAssignment.estimatedDurationMinutes} min estimados
                      </span>
                    )}
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                      Início: {formatDate(primaryAssignment.startsOn)}
                    </span>
                    {primaryAssignment.endsOn && (
                      <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        Término: {formatDate(primaryAssignment.endsOn)}
                      </span>
                    )}
                  </div>

                  {/* Coach Notes */}
                  {primaryAssignment.notesForStudent && (
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-[var(--text-primary)] space-y-1.5">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">
                        Orientações do seu treinador:
                      </p>
                      <p className="text-[var(--text-secondary)] italic leading-relaxed">
                        &ldquo;{primaryAssignment.notesForStudent}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECONDARY WORKOUTS (HORIZONTAL SNAP RAIL ON MOBILE, GRID ON DESKTOP) */}
            {secondaryAssignments.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
                      Outras Fichas & Divisões
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Rotinas complementares prescritas para a sua periodização.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-tertiary)] hidden sm:inline">
                    {secondaryAssignments.length} opções
                  </span>
                </div>

                {/* Horizontal Rail: overflow-x confined strictly to the rail */}
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:overflow-visible">
                  {secondaryAssignments.map((assignment) => (
                    <div
                      key={assignment.assignmentPublicId}
                      className="w-[84vw] max-w-[360px] shrink-0 sm:w-auto sm:max-w-none snap-center p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--brand)] transition-all flex flex-col justify-between space-y-4 depth-surface"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-2xs">
                            Versão {assignment.versionNumber}
                          </span>
                          {assignment.difficultyLevel && (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {assignment.difficultyLevel === "BEGINNER"
                                ? "Iniciante"
                                : assignment.difficultyLevel === "ADVANCED"
                                  ? "Avançado"
                                  : "Intermediário"}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
                            {assignment.workoutTitle}
                          </h3>
                          {assignment.subtitle && (
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                              {assignment.subtitle}
                            </p>
                          )}
                        </div>

                        {assignment.objective && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            <span className="font-semibold text-[var(--text-primary)]">Objetivo: </span>
                            {assignment.objective}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {assignment.blockCount} {assignment.blockCount === 1 ? "bloco" : "blocos"}
                          </span>
                          {assignment.estimatedDurationMinutes && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              · <Clock className="w-3 h-3 text-[var(--text-secondary)]" strokeWidth={1.75} /> {assignment.estimatedDurationMinutes} min
                            </span>
                          )}
                          <span>· Início: {formatDate(assignment.startsOn)}</span>
                        </div>

                        <Link
                          href={`/consultoria/${slug}/treinos/${assignment.assignmentPublicId}`}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-xs transition-all min-h-[44px] depth-interactive cursor-pointer"
                        >
                          Acessar este treino →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TRAINING CONTINUITY AND HISTORY CARD */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] font-heading">
                    Registro de Execução & Séries
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
                  Ao abrir e iniciar qualquer ficha, o Trevo One armazena suas cargas, repetições realizadas e tempo de descanso para comparação na próxima sessão.
                </p>
              </div>
              <div className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                Sincronização Ativa
              </div>
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
